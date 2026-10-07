package com.equipgrid.whatsapp.service;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.entity.AssetMedia;
import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.asset.repository.AssetMediaRepository;
import com.equipgrid.asset.repository.AssetQueryRepository;
import com.equipgrid.booking.dto.request.CreateBookingRequest;
import com.equipgrid.booking.dto.request.QuoteRequest;
import com.equipgrid.booking.dto.response.QuoteResponse;
import com.equipgrid.booking.entity.Booking;
import com.equipgrid.booking.enums.BookingStatus;
import com.equipgrid.booking.repository.BookingQueryRepository;
import com.equipgrid.booking.service.IBookingService;
import com.equipgrid.common.storage.service.StorageService;
import com.equipgrid.customer.entity.Customer;
import com.equipgrid.customer.enums.CustomerTier;
import com.equipgrid.customer.repository.CustomerQueryRepository;
import com.equipgrid.customer.repository.CustomerRepository;
import com.equipgrid.dispatch.entity.DispatchRecord;
import com.equipgrid.dispatch.repository.DispatchQueryRepository;
import com.equipgrid.location.entity.Hub;
import com.equipgrid.location.repository.HubRepository;
import com.equipgrid.payment.dto.request.RecordPaymentRequest;
import com.equipgrid.payment.entity.Payment;
import com.equipgrid.payment.enums.PaymentMode;
import com.equipgrid.payment.enums.PaymentType;
import com.equipgrid.payment.service.IPaymentService;
import com.equipgrid.whatsapp.dto.model.UpiPaymentDetails;
import com.equipgrid.whatsapp.dto.model.VoiceBookingIntent;
import com.equipgrid.whatsapp.dto.model.WhatsAppConversationContext;
import com.equipgrid.whatsapp.dto.request.WhatsAppInboundRequest;
import com.equipgrid.whatsapp.dto.response.WhatsAppMessageResponse;
import com.equipgrid.whatsapp.entity.WhatsAppConversation;
import com.equipgrid.whatsapp.enums.WhatsAppState;
import com.equipgrid.whatsapp.repository.WhatsAppConversationQueryRepository;
import com.equipgrid.whatsapp.repository.WhatsAppConversationRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class WhatsAppBotServiceImpl implements IWhatsAppBotService {

    private static final String S3_FALLBACK_BASE = "https://equipgrid-assets-dev.s3.ap-south-1.amazonaws.com";
    private static final Pattern LAT_LNG_PATTERN = Pattern.compile("([-+]?[0-9]{1,2}\\.[0-9]{3,})[,\\s]+([-+]?[0-9]{1,3}\\.[0-9]{3,})");

    private final WhatsAppConversationRepository conversationRepository;
    private final WhatsAppConversationQueryRepository conversationQueryRepository;
    private final CustomerRepository customerRepository;
    private final CustomerQueryRepository customerQueryRepository;
    private final AssetQueryRepository assetQueryRepository;
    private final AssetMediaRepository assetMediaRepository;
    private final HubRepository hubRepository;
    private final IBookingService bookingService;
    private final BookingQueryRepository bookingQueryRepository;
    private final IPaymentService paymentService;
    private final DispatchQueryRepository dispatchQueryRepository;
    private final IUpiQrGeneratorService upiQrGeneratorService;
    private final StorageService storageService;
    private final ObjectMapper objectMapper;
    private final VoiceNoteProcessingService voiceNoteProcessingService;
    private final ChallanDocumentService challanDocumentService;

    @Override
    @Transactional
    public WhatsAppMessageResponse processIncomingMessage(WhatsAppInboundRequest request) {
        String rawPhone = request.getFrom();
        String normalizedPhone = normalizePhoneNumber(rawPhone);
        String messageText = request.getMessage() != null ? request.getMessage().trim() : "";
        String senderName = request.getUserName() != null ? request.getUserName().trim() : "Farmer";

        log.info("[WhatsApp Bot] Processing message from phone: {} (raw: {}), mediaType: '{}', text: '{}'",
                normalizedPhone, rawPhone, request.getMediaType(), messageText);

        // 1. Get or create Customer identified by mobile phone
        Customer customer = getOrCreateCustomer(normalizedPhone, senderName);

        // 2. Fetch or initialize conversation session
        WhatsAppConversation conversation = getOrCreateConversation(normalizedPhone);
        conversation.setLastMessageReceived(messageText);
        conversation.setLastInteractionAt(LocalDateTime.now());

        // ─── Voice Note Intercept ─────────────────────────────────────────────
        // Detect if incoming message is an audio/voice note and process it first.
        // Pre-transcribed text (from BSP like Gupshup) takes priority over raw audio URL.
        boolean isVoiceNote = isVoiceMessage(request);
        if (isVoiceNote) {
            WhatsAppConversationContext context = parseContext(conversation.getContextData());
            if (context.getCustomerName() == null) context.setCustomerName(customer.getFullName());
            WhatsAppMessageResponse voiceResponse = handleVoiceNoteMessage(request, conversation, customer, context);
            if (voiceResponse != null) {
                conversation.setContextData(serializeContext(context));
                conversationRepository.save(conversation);
                return voiceResponse;
            }
            // If voice handling produced null (intent was handled inline), fall through to state machine
            // with the transcribed text having been injected into messageText
            messageText = context.getLastVoiceTranscript() != null ? context.getLastVoiceTranscript() : messageText;
        }

        // Check for universal reset/menu keywords
        if (isMenuKeyword(messageText)) {
            return resetAndShowMainMenu(conversation, customer);
        }

        WhatsAppConversationContext context = parseContext(conversation.getContextData());
        if (context.getCustomerName() == null) {
            context.setCustomerName(customer.getFullName());
        }

        // Check for quick media trigger (re-show video/photos of selected machine)
        if (isMediaKeyword(messageText) && context.getSelectedAssetId() != null) {
            return showMediaLinks(conversation, context);
        }

        WhatsAppMessageResponse response;

        // 3. State machine dispatch
        switch (conversation.getState()) {
            case MAIN_MENU -> response = handleMainMenuSelection(messageText, conversation, customer, context);
            case SELECTING_HUB -> response = handleHubSelection(messageText, conversation, customer, context);
            case SELECTING_CATEGORY -> response = handleCategorySelection(messageText, conversation, customer, context);
            case SELECTING_ASSET -> response = handleAssetSelection(messageText, conversation, customer, context);
            case ENTERING_DATES -> response = handleDateInput(messageText, conversation, customer, context);
            case SELECTING_DELIVERY_DESTINATION -> response = handleDeliveryDestinationSelection(messageText, conversation, customer, context);
            case ENTERING_LOCATION -> response = handleLocationInput(request, messageText, conversation, customer, context);
            case CONFIRMING_BOOKING -> response = handleBookingConfirmation(messageText, conversation, customer, context);
            case AWAITING_PAYMENT -> response = handlePaymentFlow(messageText, conversation, customer, context);
            case TRACKING_ORDER -> response = handleTracking(conversation, customer);
            case REQUESTING_RETURN -> response = handleReturnRequest(messageText, conversation, customer, context);
            case DAMAGE_CHECKLIST_ACTIVE -> response = handleDamageChecklistStep(request, messageText, conversation, customer, context);
            case PROCESSING_VOICE -> response = handleMainMenuSelection(messageText, conversation, customer, context);
            default -> response = resetAndShowMainMenu(conversation, customer);
        }

        // Persist updated conversation state and context
        conversation.setContextData(serializeContext(context));
        conversationRepository.save(conversation);

        return response;
    }

    @Override
    @Transactional
    public void resetConversation(String phoneNumber) {
        String normalized = normalizePhoneNumber(phoneNumber);
        conversationQueryRepository.fetchByPhone(normalized).ifPresent(conv -> {
            conv.setState(WhatsAppState.MAIN_MENU);
            conv.setContextData(null);
            conv.setLastInteractionAt(LocalDateTime.now());
            conversationRepository.save(conv);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public List<WhatsAppConversation> getAllConversations() {
        return conversationRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<WhatsAppConversation> getConversationByPhone(String phoneNumber) {
        return conversationQueryRepository.fetchByPhone(normalizePhoneNumber(phoneNumber));
    }

    public static String getEquipmentHindiName(String name, String tag) {
        if (name == null) return "उपकरण (Equipment)";
        String lower = name.toLowerCase();
        String upperTag = tag != null ? tag.toUpperCase() : "";

        if (lower.contains("concrete mixer") || upperTag.contains("MIX")) {
            return "कंक्रीट मिलाने की मशीन (Concrete Mixer)";
        } else if (lower.contains("vibrator") || upperTag.contains("VIB")) {
            return "कंक्रीट बैठाने/कंपन की मशीन (Concrete Vibrator)";
        } else if (lower.contains("compactor") || lower.contains("rammer") || upperTag.contains("CMP")) {
            return "मिट्टी व रोड़ी कुटाई/दबाने की मशीन (Plate Compactor)";
        } else if (lower.contains("jackhammer") || lower.contains("demolition") || upperTag.contains("JKH")) {
            return "कंक्रीट व पत्थर तोड़ने की मशीन (Demolition Jackhammer)";
        } else if (lower.contains("trash pump") || lower.contains("pump") || upperTag.contains("PMP")) {
            return "पानी व कीचड़ निकालने का पम्प (Dewatering Trash Pump)";
        } else if (lower.contains("generator") || upperTag.contains("GEN")) {
            return "बिजली जनरेटर (Portable Power Generator)";
        } else if (lower.contains("weeder") || upperTag.contains("WED")) {
            return "खेत की जुताई व निराई-गुड़ाई की मशीन (Power Weeder)";
        } else if (lower.contains("reaper") || lower.contains("harvester") || upperTag.contains("REP")) {
            return "फसल/धान व गेहूँ काटने की मशीन (Crop Power Reaper)";
        } else if (lower.contains("auger") || lower.contains("post-hole") || upperTag.contains("AUG")) {
            return "जमीन में गड्ढा खोदने की मशीन (Post-Hole Earth Auger)";
        } else if (lower.contains("tractor") || upperTag.contains("TRAC")) {
            return "खेत जुताई ट्रैक्टर (Farm Tractor)";
        } else if (lower.contains("rotavator")) {
            return "रोटावेटर (Rotavator)";
        } else if (lower.contains("sprayer")) {
            return "कीटनाशक छिड़कने की मशीन (Power Sprayer)";
        } else if (lower.contains("thresher")) {
            return "अनाज निकालने का थ्रेशर (Crop Thresher)";
        } else {
            return name;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<WhatsAppMessageResponse> getCatalog(Long hubId) {
        List<Asset> assets = assetQueryRepository.fetchAssets(null, AssetStatus.AVAILABLE);
        if (hubId != null) {
            assets = assets.stream().filter(a -> a.getHub() != null && a.getHub().getId().equals(hubId)).toList();
        }

        List<WhatsAppMessageResponse> catalog = new ArrayList<>();
        for (Asset a : assets) {
            List<AssetMedia> media = assetMediaRepository.findByAssetIdOrderByMediaTypeAscDisplayOrderAsc(a.getId());
            String videoUrl = null;
            String previewImg = null;
            List<String> images = new ArrayList<>();

            for (AssetMedia m : media) {
                String resolved = resolveMediaUrl(m.getS3Key());
                if ("VIDEO".equalsIgnoreCase(m.getMediaType())) {
                    videoUrl = resolved;
                } else {
                    if (previewImg == null) previewImg = resolved;
                    images.add(resolved);
                }
            }

            String hindiName = getEquipmentHindiName(a.getName(), a.getAssetTag());
            catalog.add(WhatsAppMessageResponse.builder()
                    .bookingNumber(a.getAssetTag())
                    .message(a.getName() + " [" + hindiName + "] (" + a.getAssetTag() + ") - Daily: ₹" + a.getDailyRate() + ", Deposit: ₹" + a.getDepositAmount())
                    .previewImageUrl(previewImg)
                    .demoVideoUrl(videoUrl)
                    .mediaUrls(images)
                    .hubName(a.getHub() != null ? a.getHub().getName() : "Central Hub")
                    .cityName(a.getHub() != null && a.getHub().getCity() != null ? a.getHub().getCity().getName() : "Uttar Pradesh")
                    .build());
        }
        return catalog;
    }

    // ==================== STATE HANDLERS ====================

    private WhatsAppMessageResponse resetAndShowMainMenu(WhatsAppConversation conv, Customer customer) {
        conv.setState(WhatsAppState.MAIN_MENU);
        conv.setContextData(null);
        conversationRepository.save(conv);

        String menuText = """
                🌾 *Namaste %s! Welcome to EquipGrid Rentals* 🚜
                _(ग्रामीण भारत की विश्वसनीय कृषि व निर्माण उपकरण सेवा)_
                
                Please select an option (विकल्प चुनें):
                *1* 🚜 *Browse Machinery & Rent* (मशीनें देखें और बुक करें)
                *2* 🏙️ *Select / Change Station Hub* (हब स्टेशन चुनें - Hardoi, Lucknow, Kanpur)
                *3* 💳 *Pay Rent / Security via UPI QR* (यूपीआई क्यूआर से भुगतान)
                *4* 📍 *Track Equipment & Outward Challan* (ऑर्डर व मशीन ट्रैक करें)
                *5* 🔄 *Instant Machine Return & Deposit Refund* (मशीन वापसी व रिफंड)
                *6* 📞 *Kisan Helpline & Support* (सहायता केंद्र)
                
                💡 _Reply with 1, 2, 3, 4, 5, or 6. Type *MENU* anytime to return here._
                """.formatted(customer.getFullName());

        return WhatsAppMessageResponse.builder()
                .to(conv.getPhoneNumber())
                .message(menuText)
                .state(WhatsAppState.MAIN_MENU)
                .suggestedOptions(List.of("1. Browse & Rent", "2. Choose Hub", "3. Pay UPI QR", "4. Track Status", "5. Return & Refund", "6. Help"))
                .sessionReset(true)
                .build();
    }

    private WhatsAppMessageResponse handleMainMenuSelection(String input, WhatsAppConversation conv, Customer customer, WhatsAppConversationContext context) {
        String trimmed = input.toUpperCase().trim();

        if (trimmed.equals("1") || trimmed.contains("RENT") || trimmed.contains("BOOK") || trimmed.contains("CATALOG") || trimmed.contains("MACHIN")) {
            return promptCategorySelection(conv, context);
        } else if (trimmed.equals("2") || trimmed.contains("HUB") || trimmed.contains("CITY") || trimmed.contains("STATION")) {
            return displayHubOptions(conv, context);
        } else if (trimmed.equals("3") || trimmed.contains("PAY") || trimmed.contains("BHUGTAN") || trimmed.contains("QR")) {
            return initiatePaymentOption(conv, customer, context);
        } else if (trimmed.equals("4") || trimmed.contains("TRACK") || trimmed.contains("STATUS") || trimmed.contains("ORDER") || trimmed.contains("CHALLAN")) {
            return handleTracking(conv, customer);
        } else if (trimmed.equals("5") || trimmed.contains("RETURN") || trimmed.contains("WAPAS") || trimmed.contains("REFUND")) {
            return initiateReturnOption(conv, customer, context);
        } else if (trimmed.equals("6") || trimmed.contains("HELP") || trimmed.contains("SUPPORT") || trimmed.contains("CALL")) {
            return showHelplineResponse(conv);
        } else {
            return resetAndShowMainMenu(conv, customer);
        }
    }

    // ─── Category Selection ───────────────────────────────────────────────────

    private WhatsAppMessageResponse promptCategorySelection(WhatsAppConversation conv, WhatsAppConversationContext context) {
        conv.setState(WhatsAppState.SELECTING_CATEGORY);

        String text = """
                🚜 *What type of machinery are you looking for?*
                _(आप किस प्रकार के उपकरण ढूंढ रहे हैं?)_
                
                *1.* 🌾 *Agriculture Machinery* (कृषि उपकरण - जुताई, बुवाई, कटाई व निराई-गुड़ाई)
                *2.* 🏗️ *Construction Equipment* (निर्माण उपकरण - कंक्रीट मिलाने की मशीन, वाइब्रेटर, पम्प, जनरेटर)
                
                👉 *Reply with 1 or 2:*
                • *1* for Agriculture (कृषि उपकरण)
                • *2* for Construction (निर्माण उपकरण)
                """;

        return WhatsAppMessageResponse.builder()
                .to(conv.getPhoneNumber())
                .message(text)
                .state(WhatsAppState.SELECTING_CATEGORY)
                .suggestedOptions(List.of("1. Agriculture 🌾", "2. Construction 🏗️", "MENU"))
                .build();
    }

    private WhatsAppMessageResponse handleCategorySelection(String input, WhatsAppConversation conv, Customer customer, WhatsAppConversationContext context) {
        String trimmed = input.toUpperCase().trim();

        if (trimmed.equals("1") || trimmed.contains("AGRI") || trimmed.contains("KRISHI") || trimmed.contains("FARM") || trimmed.contains("KHET")) {
            context.setAssetCategory("AGRICULTURE");
            context.setSelectedCategory("AGRICULTURE");
        } else if (trimmed.equals("2") || trimmed.contains("CONST") || trimmed.contains("NIRMAN") || trimmed.contains("BUILD") || trimmed.contains("CIVIL")) {
            context.setAssetCategory("CONSTRUCTION");
            context.setSelectedCategory("CONSTRUCTION");
        } else {
            return WhatsAppMessageResponse.builder()
                    .to(conv.getPhoneNumber())
                    .message("⚠️ Please reply *1* for Agriculture Machinery (कृषि) or *2* for Construction Equipment (निर्माण), or type *MENU*.")
                    .state(WhatsAppState.SELECTING_CATEGORY)
                    .suggestedOptions(List.of("1. Agriculture 🌾", "2. Construction 🏗️", "MENU"))
                    .build();
        }

        // If the user has not yet selected a Station Hub, prompt Hub/City selection to narrow down search space
        if (context.getSelectedHubId() == null) {
            return displayHubOptions(conv, context);
        } else {
            return promptRentalDates(conv, context);
        }
    }

    // ─── Hub Selection ─────────────────────────────────────────────────────────

    private WhatsAppMessageResponse displayHubOptions(WhatsAppConversation conv, WhatsAppConversationContext context) {
        List<Hub> hubs = hubRepository.findByActiveTrueOrderByNameAsc();
        StringBuilder sb = new StringBuilder();

        String catSub = "";
        if ("AGRICULTURE".equalsIgnoreCase(context.getAssetCategory())) {
            catSub = " for *🌾 Agriculture Machinery*";
        } else if ("CONSTRUCTION".equalsIgnoreCase(context.getAssetCategory())) {
            catSub = " for *🏗️ Construction Equipment*";
        }

        sb.append("🏙️ *Select Your Nearest EquipGrid Station Hub").append(catSub).append(":*\n");
        sb.append("_(निकटतम स्टेशन चुनें - जहाँ से मशीन तुरंत भेजी जाएगी)_\n\n");

        List<String> options = new ArrayList<>();
        int idx = 1;
        for (Hub h : hubs) {
            String cityStr = h.getCity() != null ? h.getCity().getName() : "";
            sb.append(String.format("*%d.* *%s* (%s)\n", idx, h.getName(), cityStr));
            sb.append(String.format("   • Operating Radius: %s km\n", h.getOperatingRadiusKm()));
            if (h.getContactPhone() != null) {
                sb.append(String.format("   • Yard Helpline: %s\n", h.getContactPhone()));
            }
            sb.append("\n");
            options.add(idx + ". " + h.getName());
            idx++;
        }

        sb.append(String.format("*%d.* *All Hubs* (पूरे नेटवर्क की सभी उपलब्ध मशीनें देखें)\n\n", idx));
        options.add(idx + ". All Hubs");

        sb.append("👉 Reply with *1, 2, 3...* to select your Station Hub.");

        conv.setState(WhatsAppState.SELECTING_HUB);

        return WhatsAppMessageResponse.builder()
                .to(conv.getPhoneNumber())
                .message(sb.toString())
                .state(WhatsAppState.SELECTING_HUB)
                .suggestedOptions(options)
                .build();
    }

    private WhatsAppMessageResponse handleHubSelection(String input, WhatsAppConversation conv, Customer customer, WhatsAppConversationContext context) {
        List<Hub> hubs = hubRepository.findByActiveTrueOrderByNameAsc();
        int choice = -1;
        try {
            choice = Integer.parseInt(input.trim());
        } catch (NumberFormatException ignored) {}

        if (choice >= 1 && choice <= hubs.size()) {
            Hub chosen = hubs.get(choice - 1);
            context.setSelectedHubId(chosen.getId());
            context.setSelectedHubName(chosen.getName());
            context.setSelectedCityName(chosen.getCity() != null ? chosen.getCity().getName() : "Uttar Pradesh");
        } else if (choice == 0 || choice == hubs.size() + 1 || input.toUpperCase().contains("ALL")) {
            context.setSelectedHubId(null);
            context.setSelectedHubName("All Hubs");
            context.setSelectedCityName("Network Wide");
        } else {
            // Check string matching
            String lower = input.toLowerCase().trim();
            Hub matched = hubs.stream().filter(h -> h.getName().toLowerCase().contains(lower) || (h.getCity() != null && h.getCity().getName().toLowerCase().contains(lower))).findFirst().orElse(null);
            if (matched != null) {
                context.setSelectedHubId(matched.getId());
                context.setSelectedHubName(matched.getName());
                context.setSelectedCityName(matched.getCity() != null ? matched.getCity().getName() : "Uttar Pradesh");
            } else {
                return WhatsAppMessageResponse.builder()
                        .to(conv.getPhoneNumber())
                        .message("⚠️ Please select a valid Hub number from the list or reply *MENU*.")
                        .state(WhatsAppState.SELECTING_HUB)
                        .build();
            }
        }

        // If user hasn't selected category yet (e.g. from Main Menu option 2), ask category now
        if (context.getAssetCategory() == null) {
            return promptCategorySelection(conv, context);
        }

        return promptRentalDates(conv, context);
    }

    private WhatsAppMessageResponse promptRentalDates(WhatsAppConversation conv, WhatsAppConversationContext context) {
        conv.setState(WhatsAppState.ENTERING_DATES);

        String catStr = "AGRICULTURE".equalsIgnoreCase(context.getAssetCategory())
                ? "🌾 Agriculture Machinery (कृषि उपकरण)"
                : ("CONSTRUCTION".equalsIgnoreCase(context.getAssetCategory()) ? "🏗️ Construction Equipment (निर्माण उपकरण)" : "Machinery");
        String hubStr = context.getSelectedHubName() != null ? " at *" + context.getSelectedHubName() + "*" : "";

        String msg = String.format("""
                📅 *Select Rental Duration for %s%s:*
                _(उपकरण कब से और कितने दिनों के लिए चाहिए?)_
                
                • For how many days do you need the machinery?
                • Available starting from tomorrow (*%s*)
                
                👉 *Reply with number of days* (e.g. *1*, *2*, *3*, *5*, or *7*):
                _(उदाहरण: *2* दिन के लिए *2* या *3* दिन के लिए *3* लिखकर भेजें)_
                """,
                catStr,
                hubStr,
                LocalDate.now().plusDays(1).format(DateTimeFormatter.ofPattern("dd MMM yyyy"))
        );

        return WhatsAppMessageResponse.builder()
                .to(conv.getPhoneNumber())
                .message(msg)
                .state(WhatsAppState.ENTERING_DATES)
                .suggestedOptions(List.of("1 Day", "2 Days", "3 Days", "5 Days", "7 Days (1 Week)"))
                .hubName(context.getSelectedHubName())
                .cityName(context.getSelectedCityName())
                .build();
    }

    // ─── Machinery Browsing ───────────────────────────────────────────────────

    private WhatsAppMessageResponse displayAvailableMachinery(WhatsAppConversation conv, WhatsAppConversationContext context) {
        AssetCategory catFilter = null;
        if ("AGRICULTURE".equalsIgnoreCase(context.getAssetCategory())) {
            catFilter = AssetCategory.AGRICULTURE;
        } else if ("CONSTRUCTION".equalsIgnoreCase(context.getAssetCategory())) {
            catFilter = AssetCategory.CONSTRUCTION;
        }

        List<Asset> allAvailable = assetQueryRepository.fetchAssets(catFilter, AssetStatus.AVAILABLE);

        List<Asset> filtered = allAvailable;
        if (context.getSelectedHubId() != null) {
            List<Asset> hubFiltered = allAvailable.stream()
                    .filter(a -> a.getHub() != null && a.getHub().getId().equals(context.getSelectedHubId()))
                    .toList();
            if (!hubFiltered.isEmpty()) {
                filtered = hubFiltered;
            }
        }

        // Date window conflict filter: Show only machines with 0 conflicting active bookings!
        if (context.getStartDate() != null && context.getEndDate() != null) {
            filtered = filtered.stream()
                    .filter(a -> bookingQueryRepository.countConflictingBookings(a.getId(), context.getStartDate(), context.getEndDate()) == 0)
                    .toList();
        }

        String catLabel = "AGRICULTURE".equalsIgnoreCase(context.getAssetCategory())
                ? "🌾 Agriculture Machinery (कृषि उपकरण)"
                : ("CONSTRUCTION".equalsIgnoreCase(context.getAssetCategory()) ? "🏗️ Construction Equipment (निर्माण उपकरण)" : "Machinery");
        String stationHeader = context.getSelectedHubName() != null ? " at *" + context.getSelectedHubName() + "*" : "";
        String dateSub = context.getStartDate() != null && context.getEndDate() != null
                ? String.format("\n🗓️ *Window: %s to %s (%d Days)*", context.getStartDate(), context.getEndDate(), context.getRentalDays())
                : "";

        if (filtered.isEmpty()) {
            conv.setState(WhatsAppState.MAIN_MENU);
            String datesStr = (context.getStartDate() != null && context.getEndDate() != null)
                    ? String.format("for *%s to %s*", context.getStartDate(), context.getEndDate())
                    : "at this time";
            return WhatsAppMessageResponse.builder()
                    .to(conv.getPhoneNumber())
                    .message(String.format("⚠️ All machinery in this yard is currently booked %s.\n\nPlease reply *1* to try another date range, or call our Kisan & Contractor Helpline (1800-889-AGRI) for advance reservation.", datesStr))
                    .state(WhatsAppState.MAIN_MENU)
                    .suggestedOptions(List.of("1. Try Other Dates", "6. Kisan Helpline", "MENU"))
                    .build();
        }

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("🚜 *Available %s%s:*%s\n", catLabel, stationHeader, dateSub));
        sb.append("_(उपलब्ध उपकरण - फोटो व 10-सेकंड वीडियो डेमो सहित)_\n\n");

        List<String> options = new ArrayList<>();
        int index = 1;
        for (Asset asset : filtered) {
            String hubStr = asset.getHub() != null ? asset.getHub().getName() : "Central Hub";
            String hindiName = getEquipmentHindiName(asset.getName(), asset.getAssetTag());

            sb.append(String.format("*%d.* *%s* (`%s`)\n", index, asset.getName(), asset.getAssetTag()));
            sb.append(String.format("   👉 *%s*\n", hindiName));
            sb.append(String.format("   • 📍 Yard: %s\n", hubStr));
            sb.append(String.format("   • 💰 Daily Rent: ₹%,.0f/day\n", asset.getDailyRate()));
            sb.append(String.format("   • 🛡️ Deposit: ₹%,.0f (100%% Refundable)\n", asset.getDepositAmount()));
            sb.append("   • 📸 4 Photos & 🎥 10-sec Demo Video Available\n\n");

            options.add(String.format("%d. %s", index, asset.getName()));
            index++;
        }

        sb.append("👉 *Reply with Machine Number (e.g. 1)* or Tag (e.g. `C-MIX-001`) to inspect video, photos & proceed.");

        conv.setState(WhatsAppState.SELECTING_ASSET);

        return WhatsAppMessageResponse.builder()
                .to(conv.getPhoneNumber())
                .message(sb.toString())
                .state(WhatsAppState.SELECTING_ASSET)
                .suggestedOptions(options)
                .hubName(context.getSelectedHubName())
                .cityName(context.getSelectedCityName())
                .build();
    }

    // ─── Machine Selection & Media Presentation ───────────────────────────────

    private WhatsAppMessageResponse handleAssetSelection(String input, WhatsAppConversation conv, Customer customer, WhatsAppConversationContext context) {
        AssetCategory catFilter = null;
        if ("AGRICULTURE".equalsIgnoreCase(context.getAssetCategory())) {
            catFilter = AssetCategory.AGRICULTURE;
        } else if ("CONSTRUCTION".equalsIgnoreCase(context.getAssetCategory())) {
            catFilter = AssetCategory.CONSTRUCTION;
        }

        List<Asset> availableAssets = assetQueryRepository.fetchAssets(catFilter, AssetStatus.AVAILABLE);

        if (context.getSelectedHubId() != null) {
            List<Asset> hubFiltered = availableAssets.stream()
                    .filter(a -> a.getHub() != null && a.getHub().getId().equals(context.getSelectedHubId()))
                    .toList();
            if (!hubFiltered.isEmpty()) {
                availableAssets = hubFiltered;
            }
        }

        // Apply exact same date-window collision check
        if (context.getStartDate() != null && context.getEndDate() != null) {
            availableAssets = availableAssets.stream()
                    .filter(a -> bookingQueryRepository.countConflictingBookings(a.getId(), context.getStartDate(), context.getEndDate()) == 0)
                    .toList();
        }

        Asset selected = null;

        // Try numeric index matching (1, 2, 3)
        try {
            int choice = Integer.parseInt(input.trim());
            if (choice >= 1 && choice <= availableAssets.size()) {
                selected = availableAssets.get(choice - 1);
            }
        } catch (NumberFormatException ignored) {}

        // Try tag or name match
        if (selected == null) {
            String search = input.trim().toLowerCase();
            for (Asset a : availableAssets) {
                if (a.getAssetTag().equalsIgnoreCase(input.trim()) ||
                        a.getName().toLowerCase().contains(search) ||
                        (a.getModelName() != null && a.getModelName().toLowerCase().contains(search))) {
                    selected = a;
                    break;
                }
            }
        }

        if (selected == null) {
            return WhatsAppMessageResponse.builder()
                    .to(conv.getPhoneNumber())
                    .message("⚠️ Could not find that machine. Please reply with a valid number from the list (e.g. *1* or *2*), or type *MENU* to restart.")
                    .state(WhatsAppState.SELECTING_ASSET)
                    .build();
        }

        // Store selected machine in context
        context.setSelectedAssetId(selected.getId());
        context.setSelectedAssetName(selected.getName());
        context.setSelectedAssetTag(selected.getAssetTag());
        context.setAssetCategory(selected.getCategory() != null ? selected.getCategory().name() : "CONSTRUCTION");
        context.setDailyRate(selected.getDailyRate());
        context.setSecurityDeposit(selected.getDepositAmount());
        if (selected.getHub() != null) {
            context.setSelectedHubId(selected.getHub().getId());
            context.setSelectedHubName(selected.getHub().getName());
            if (selected.getHub().getCity() != null) {
                context.setSelectedCityName(selected.getHub().getCity().getName());
            }
        }

        // Fetch S3 media items for this machine (4 photos + 1 10-second demo video)
        List<AssetMedia> mediaList = assetMediaRepository.findByAssetIdOrderByMediaTypeAscDisplayOrderAsc(selected.getId());
        String demoVideoUrl = null;
        String previewImgUrl = null;
        List<String> photoUrls = new ArrayList<>();

        for (AssetMedia m : mediaList) {
            String resolved = resolveMediaUrl(m.getS3Key());
            if ("VIDEO".equalsIgnoreCase(m.getMediaType())) {
                demoVideoUrl = resolved;
            } else {
                if (previewImgUrl == null) previewImgUrl = resolved;
                photoUrls.add(resolved);
            }
        }

        context.setDemoVideoUrl(demoVideoUrl);
        context.setPreviewImageUrl(previewImgUrl);
        context.setMediaUrls(photoUrls);

        String hindiName = getEquipmentHindiName(selected.getName(), selected.getAssetTag());
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("🚜 *Selected: %s* (`%s`)\n", selected.getName(), selected.getAssetTag()));
        sb.append(String.format("   👉 *%s*\n", hindiName));
        if (selected.getHub() != null) {
            sb.append(String.format("📍 Station Hub: *%s*\n", selected.getHub().getName()));
        }
        sb.append(String.format("• 💰 Daily Rent: ₹%,.0f/day\n", selected.getDailyRate()));
        sb.append(String.format("• 🛡️ Security Deposit: ₹%,.0f (100%% Refundable)\n", selected.getDepositAmount()));
        if (selected.getModelName() != null) {
            sb.append(String.format("• ⚙️ Model: %s\n", selected.getModelName()));
        }
        sb.append("━━━━━━━━━━━━━━━━━━━━━━\n");

        if (demoVideoUrl != null) {
            sb.append("🎥 *Watch 10-Second Demo Video:*\n");
            sb.append(demoVideoUrl).append("\n\n");
        }

        if (!photoUrls.isEmpty()) {
            sb.append("📸 *Machine High-Res Photos:*\n");
            int pIdx = 1;
            for (String pUrl : photoUrls) {
                sb.append(String.format("%d. %s\n", pIdx++, pUrl));
            }
            sb.append("\n");
        }

        // If dates are already known from the previous step:
        if (context.getRentalDays() != null && context.getStartDate() != null) {
            boolean isAgri = "AGRICULTURE".equalsIgnoreCase(context.getAssetCategory());
            String hubNote = context.getSelectedHubName() != null ? " (Dispatched from " + context.getSelectedHubName() + ")" : "";

            if (isAgri) {
                conv.setState(WhatsAppState.SELECTING_DELIVERY_DESTINATION);
                sb.append(String.format("""
                        🗓️ Rental Period: *%d Days* (%s to %s)%s
                        
                        🌾 *Where do you need this equipment delivered?*
                        _(उपकरण कहाँ डिलीवर करवाना चाहते हैं?)_
                        
                        *1.* 🏠 *Home / Village Address* (घर या गाँव का पता)
                        *2.* 🚜 *Direct Farm / Field (Khet) Geo-Tag* (खेत पर डिलीवरी - सटीक लोकेशन पिन)
                        
                        💡 *Kisan Tip:*
                        _Selecting *Farm (2)* ensures our delivery trailer reaches right to your field gate without getting stuck in narrow village lanes._
                        
                        👉 *Reply with 1 or 2:*
                        • Reply *1* for Home / Village
                        • Reply *2* for Farm Field Geo-Tag
                        """,
                        context.getRentalDays(), context.getStartDate(), context.getEndDate(), hubNote
                ));

                return WhatsAppMessageResponse.builder()
                        .to(conv.getPhoneNumber())
                        .message(sb.toString())
                        .state(WhatsAppState.SELECTING_DELIVERY_DESTINATION)
                        .suggestedOptions(List.of("1. Home / Village 🏠", "2. Farm / Field 🚜"))
                        .previewImageUrl(previewImgUrl)
                        .demoVideoUrl(demoVideoUrl)
                        .mediaUrls(photoUrls)
                        .hubName(context.getSelectedHubName())
                        .cityName(context.getSelectedCityName())
                        .build();
            } else {
                context.setDeliveryDestinationType("SITE");
                conv.setState(WhatsAppState.ENTERING_LOCATION);
                sb.append(String.format("""
                        🗓️ Rental Period: *%d Days* (%s to %s)%s
                        
                        🏗️ *Construction Site Delivery Location:*
                        _(निर्माण स्थल का पता या लोकेशन)_
                        
                        You can provide the site location in either of 2 ways:
                        📍 *Option A:* Share WhatsApp Location Pin (व्हाट्सएप 📎 बटन दबाकर लोकेशन पिन भेजें)
                        ✍️ *Option B:* Type Site Address & Landmark (साइट का पता या लैंडमार्क लिखकर भेजें)
                        
                        👉 Please send your location pin or type the address below:
                        """,
                        context.getRentalDays(), context.getStartDate(), context.getEndDate(), hubNote
                ));

                return WhatsAppMessageResponse.builder()
                        .to(conv.getPhoneNumber())
                        .message(sb.toString())
                        .state(WhatsAppState.ENTERING_LOCATION)
                        .suggestedOptions(List.of("Share Location Pin 📍", "Type Site Address ✍️"))
                        .previewImageUrl(previewImgUrl)
                        .demoVideoUrl(demoVideoUrl)
                        .mediaUrls(photoUrls)
                        .hubName(context.getSelectedHubName())
                        .cityName(context.getSelectedCityName())
                        .build();
            }
        }

        // Fallback: Ask dates if not set yet
        conv.setState(WhatsAppState.ENTERING_DATES);
        sb.append("📅 *For how many days do you need this equipment?*\n");
        sb.append("_(कितने दिनों के लिए चाहिए? उदाहरण: *2* दिन या *5* दिन के लिए *2* या *5* लिखकर भेजें)_");

        return WhatsAppMessageResponse.builder()
                .to(conv.getPhoneNumber())
                .message(sb.toString())
                .state(WhatsAppState.ENTERING_DATES)
                .suggestedOptions(List.of("1 Day", "3 Days", "5 Days", "7 Days (1 Week)"))
                .previewImageUrl(previewImgUrl)
                .demoVideoUrl(demoVideoUrl)
                .mediaUrls(photoUrls)
                .hubName(context.getSelectedHubName())
                .cityName(context.getSelectedCityName())
                .build();
    }

    private WhatsAppMessageResponse showMediaLinks(WhatsAppConversation conv, WhatsAppConversationContext context) {
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("📸 *Media Gallery for %s:*\n", context.getSelectedAssetName()));
        if (context.getDemoVideoUrl() != null) {
            sb.append("\n🎥 *10-Second Demo Video:*\n").append(context.getDemoVideoUrl()).append("\n");
        }
        if (context.getMediaUrls() != null && !context.getMediaUrls().isEmpty()) {
            sb.append("\n🖼️ *Photos:*\n");
            int idx = 1;
            for (String url : context.getMediaUrls()) {
                sb.append(idx++).append(". ").append(url).append("\n");
            }
        }
        sb.append("\n👉 Reply with rental days (e.g. *3*) or type *MENU*.");

        return WhatsAppMessageResponse.builder()
                .to(conv.getPhoneNumber())
                .message(sb.toString())
                .state(conv.getState())
                .previewImageUrl(context.getPreviewImageUrl())
                .demoVideoUrl(context.getDemoVideoUrl())
                .mediaUrls(context.getMediaUrls())
                .build();
    }

    // ─── Duration & Location Input ────────────────────────────────────────────

    private WhatsAppMessageResponse handleDateInput(String input, WhatsAppConversation conv, Customer customer, WhatsAppConversationContext context) {
        int days = extractDays(input);
        if (days <= 0) {
            return WhatsAppMessageResponse.builder()
                    .to(conv.getPhoneNumber())
                    .message("⚠️ Please specify a valid duration in days, for example: *1*, *2*, *3*, or *7*.\n_(कृपया मान्य दिन संख्या दर्ज करें)_")
                    .state(WhatsAppState.ENTERING_DATES)
                    .suggestedOptions(List.of("1 Day", "2 Days", "3 Days", "5 Days", "7 Days"))
                    .build();
        }

        LocalDate startDate = LocalDate.now().plusDays(1); // Default to tomorrow morning
        LocalDate endDate = startDate.plusDays(days - 1);

        context.setRentalDays(days);
        context.setStartDate(startDate);
        context.setEndDate(endDate);

        if (context.getSelectedAssetId() == null) {
            // New streamlined funnel: Dates are selected first -> show only collision-free machines!
            return displayAvailableMachinery(conv, context);
        }

        return promptDeliveryDestinationOrLocation(conv, context);
    }

    private WhatsAppMessageResponse promptDeliveryDestinationOrLocation(WhatsAppConversation conv, WhatsAppConversationContext context) {
        String hubNote = context.getSelectedHubName() != null ? " (Dispatched from " + context.getSelectedHubName() + ")" : "";
        boolean isAgri = "AGRICULTURE".equalsIgnoreCase(context.getAssetCategory());

        if (isAgri) {
            conv.setState(WhatsAppState.SELECTING_DELIVERY_DESTINATION);

            String message = String.format("""
                    🗓️ Rental Duration: *%d Days*
                    • Start: *%s*
                    • End: *%s*%s
                    
                    🌾 *Where do you need this equipment delivered?*
                    _(उपकरण कहाँ डिलीवर करवाना चाहते हैं?)_
                    
                    *1.* 🏠 *Home / Village Address* (घर या गाँव का पता)
                    *2.* 🚜 *Direct Farm / Field (Khet) Geo-Tag* (खेत पर डिलीवरी - सटीक लोकेशन पिन)
                    
                    💡 *Kisan Tip:*
                    _Selecting *Farm (2)* ensures our delivery trailer reaches right to your field gate without getting stuck in narrow village lanes._
                    
                    👉 *Reply with 1 or 2:*
                    • Reply *1* for Home / Village
                    • Reply *2* for Farm Field Geo-Tag
                    """, context.getRentalDays(), context.getStartDate(), context.getEndDate(), hubNote);

            return WhatsAppMessageResponse.builder()
                    .to(conv.getPhoneNumber())
                    .message(message)
                    .state(WhatsAppState.SELECTING_DELIVERY_DESTINATION)
                    .suggestedOptions(List.of("1. Home / Village 🏠", "2. Farm / Field 🚜"))
                    .build();
        } else {
            context.setDeliveryDestinationType("SITE");
            conv.setState(WhatsAppState.ENTERING_LOCATION);

            String message = String.format("""
                    🗓️ Rental Duration: *%d Days*
                    • Start: *%s*
                    • End: *%s*%s
                    
                    🏗️ *Construction Site Delivery Location:*
                    _(निर्माण स्थल का पता या लोकेशन)_
                    
                    You can provide the site location in either of 2 ways:
                    📍 *Option A:* Share WhatsApp Location Pin (व्हाट्सएप 📎 बटन दबाकर लोकेशन पिन भेजें)
                    ✍️ *Option B:* Type Site Address & Landmark (साइट का पता या लैंडमार्क लिखकर भेजें)
                    
                    👉 Please send your location pin or type the address below:
                    """, context.getRentalDays(), context.getStartDate(), context.getEndDate(), hubNote);

            return WhatsAppMessageResponse.builder()
                    .to(conv.getPhoneNumber())
                    .message(message)
                    .state(WhatsAppState.ENTERING_LOCATION)
                    .suggestedOptions(List.of("Share Location Pin 📍", "Type Site Address ✍️"))
                    .build();
        }
    }

    private WhatsAppMessageResponse handleDeliveryDestinationSelection(String input, WhatsAppConversation conv, Customer customer, WhatsAppConversationContext context) {
        String trimmed = input.toUpperCase().trim();

        if (trimmed.equals("1") || trimmed.contains("HOME") || trimmed.contains("GHAR") || trimmed.contains("VILLAGE") || trimmed.contains("GAON")) {
            context.setDeliveryDestinationType("HOME");
            conv.setState(WhatsAppState.ENTERING_LOCATION);

            String message = """
                    🏠 *Home / Village Delivery Selected*
                    _(घर / गाँव पर डिलीवरी)_
                    
                    You can provide your delivery address in either way:
                    ✍️ *Option A:* Type village name, house/landmark & tehsil (e.g. *Gram Rampur, Near Primary School, Tehsil Sandila*)
                    📍 *Option B:* Share WhatsApp Location Pin (व्हाट्सएप 📎 बटन से लोकेशन पिन भेजें)
                    
                    👉 Please type your address or share your location pin:
                    """;

            return WhatsAppMessageResponse.builder()
                    .to(conv.getPhoneNumber())
                    .message(message)
                    .state(WhatsAppState.ENTERING_LOCATION)
                    .suggestedOptions(List.of("Share Location Pin 📍", "Type Village Address ✍️"))
                    .build();

        } else if (trimmed.equals("2") || trimmed.contains("FARM") || trimmed.contains("KHET") || trimmed.contains("FIELD") || trimmed.contains("GEO")) {
            context.setDeliveryDestinationType("FARM");
            conv.setState(WhatsAppState.ENTERING_LOCATION);

            String message = """
                    🚜 *Direct Farm / Field (Khet) Geo-Tag Delivery Selected*
                    _(सीधे खेत पर डिलीवरी - सटीक जियो-टैग)_
                    
                    📍 *Please share your Farm's WhatsApp Location Pin:*
                    _(अपने खेत पर पहुँचकर व्हाट्सएप 📎 ➡️ 📍 Location बटन से पिन भेजें)_
                    
                    💡 *Ordering from Home right now?*
                    • You can share a Google Maps link to your field road, or
                    • Type the field landmark & approach road (e.g. *Khet near Sharda Canal, Chak Road No. 3, Gram Rampur*), or
                    • Share your current location pin when you reach the field!
                    
                    👉 Send your WhatsApp Location Pin or type field landmark:
                    """;

            return WhatsAppMessageResponse.builder()
                    .to(conv.getPhoneNumber())
                    .message(message)
                    .state(WhatsAppState.ENTERING_LOCATION)
                    .suggestedOptions(List.of("Share Farm Pin 📍", "Type Farm Landmark ✍️"))
                    .build();

        } else {
            return WhatsAppMessageResponse.builder()
                    .to(conv.getPhoneNumber())
                    .message("⚠️ Please reply *1* for Home / Village delivery, or *2* for Farm (Khet) Geo-Tag delivery.")
                    .state(WhatsAppState.SELECTING_DELIVERY_DESTINATION)
                    .suggestedOptions(List.of("1. Home / Village 🏠", "2. Farm / Field 🚜"))
                    .build();
        }
    }

    private WhatsAppMessageResponse handleLocationInput(WhatsAppInboundRequest request, String input, WhatsAppConversation conv, Customer customer, WhatsAppConversationContext context) {
        Double lat = request.getLatitude();
        Double lng = request.getLongitude();

        if (lat != null && lng != null) {
            // Direct GPS Pin received from WhatsApp location payload
            context.setLatitude(lat);
            context.setLongitude(lng);
            context.setIsGeoLocation(true);
            String mapsUrl = "https://www.google.com/maps?q=" + lat + "," + lng;
            context.setGoogleMapsUrl(mapsUrl);

            String destType = context.getDeliveryDestinationType() != null ? context.getDeliveryDestinationType() : "SITE";
            String label = request.getLocationName() != null ? request.getLocationName() : request.getLocationAddress();
            String labelSuffix = (label != null && !label.isBlank()) ? " (" + label.trim() + ")" : "";

            String formattedAddress;
            if ("FARM".equalsIgnoreCase(destType)) {
                formattedAddress = "🌾 Farm Geo-Tag [" + String.format("%.5f°N, %.5f°E", lat, lng) + "]" + labelSuffix;
            } else if ("HOME".equalsIgnoreCase(destType)) {
                formattedAddress = "🏠 Home Geo-Pin [" + String.format("%.5f°N, %.5f°E", lat, lng) + "]" + labelSuffix;
            } else {
                formattedAddress = "🏗️ Site Geo-Pin [" + String.format("%.5f°N, %.5f°E", lat, lng) + "]" + labelSuffix;
            }
            context.setDeliveryAddress(formattedAddress);
        } else {
            // Check if text input contains GPS coordinates or Google Maps link
            Matcher matcher = LAT_LNG_PATTERN.matcher(input);
            if (matcher.find()) {
                try {
                    double parsedLat = Double.parseDouble(matcher.group(1));
                    double parsedLng = Double.parseDouble(matcher.group(2));
                    context.setLatitude(parsedLat);
                    context.setLongitude(parsedLng);
                    context.setIsGeoLocation(true);
                    context.setGoogleMapsUrl("https://www.google.com/maps?q=" + parsedLat + "," + parsedLng);

                    String destType = context.getDeliveryDestinationType() != null ? context.getDeliveryDestinationType() : "SITE";
                    String formattedAddress;
                    if ("FARM".equalsIgnoreCase(destType)) {
                        formattedAddress = "🌾 Farm Geo-Tag [" + String.format("%.5f°N, %.5f°E", parsedLat, parsedLng) + "]";
                    } else if ("HOME".equalsIgnoreCase(destType)) {
                        formattedAddress = "🏠 Home Geo-Pin [" + String.format("%.5f°N, %.5f°E", parsedLat, parsedLng) + "]";
                    } else {
                        formattedAddress = "🏗️ Site Geo-Pin [" + String.format("%.5f°N, %.5f°E", parsedLat, parsedLng) + "]";
                    }
                    context.setDeliveryAddress(formattedAddress);
                } catch (Exception e) {
                    context.setDeliveryAddress(input.trim());
                    context.setIsGeoLocation(false);
                }
            } else if (input.trim().length() >= 3) {
                // Plain text address or landmark
                String destType = context.getDeliveryDestinationType() != null ? context.getDeliveryDestinationType() : "SITE";
                String prefix = "FARM".equalsIgnoreCase(destType) ? "🌾 Farm / Field: " : ("HOME".equalsIgnoreCase(destType) ? "🏠 Home / Village: " : "🏗️ Site: ");
                context.setDeliveryAddress(prefix + input.trim());
                context.setIsGeoLocation(false);
            } else {
                String guidance = "FARM".equalsIgnoreCase(context.getDeliveryDestinationType())
                        ? "⚠️ Please share your Farm's WhatsApp location pin 📍 or type the village and field approach landmark (minimum 3 characters)."
                        : "⚠️ Please share your WhatsApp location pin 📍 or type the delivery address / landmark (minimum 3 characters).";
                return WhatsAppMessageResponse.builder()
                        .to(conv.getPhoneNumber())
                        .message(guidance)
                        .state(WhatsAppState.ENTERING_LOCATION)
                        .suggestedOptions(List.of("Share Location Pin 📍", "MENU"))
                        .build();
            }
        }

        // Calculate live quotation
        QuoteRequest quoteRequest = QuoteRequest.builder()
                .assetId(context.getSelectedAssetId())
                .startDate(context.getStartDate())
                .endDate(context.getEndDate())
                .distanceKm(new BigDecimal("15"))
                .operatorRequired(false)
                .build();

        QuoteResponse quote = bookingService.calculateQuote(quoteRequest);

        context.setCalculatedRentalAmount(quote.getBaseRent());
        context.setCalculatedDepositAmount(quote.getDepositAmount());
        context.setCalculatedTotal(quote.getTotalAmount());

        conv.setState(WhatsAppState.CONFIRMING_BOOKING);

        String hubInfo = context.getSelectedHubName() != null ? "Station Hub: *" + context.getSelectedHubName() + "*\n" : "";

        String destBadge = "FARM".equalsIgnoreCase(context.getDeliveryDestinationType())
                ? "🌾 *Direct Farm Geo-Tag*"
                : ("HOME".equalsIgnoreCase(context.getDeliveryDestinationType()) ? "🏠 *Village Home*" : "🏗️ *Construction Site*");

        String navLink = context.getGoogleMapsUrl() != null
                ? "🗺️ Navigation: " + context.getGoogleMapsUrl() + "\n"
                : "";

        String hindiName = getEquipmentHindiName(context.getSelectedAssetName(), context.getSelectedAssetTag());

        String summary = String.format("""
                📋 *EquipGrid Booking Quotation Summary*
                ━━━━━━━━━━━━━━━━━━━━━━
                🚜 Machine: *%s* (`%s`)
                   👉 *%s*
                %s📅 Duration: *%d Days* (%s to %s)
                📍 Delivery Type: %s
                📍 Destination: *%s*
                %s━━━━━━━━━━━━━━━━━━━━━━
                • Base Rent (%d Days): ₹%,.2f
                • Logistics & Transport: ₹%,.2f
                • *Security Deposit (100%% Refundable)*: ₹%,.2f
                ━━━━━━━━━━━━━━━━━━━━━━
                💰 *Total Advance Due*: *₹%,.2f*
                _(Includes ₹%,.2f 100%% Refundable Deposit)_
                
                🛡️ *Zero-Credit Guarantee*:
                Full deposit is credited back to your UPI within 2 hours of machine return inspection.
                
                👉 Reply *CONFIRM* (या *HAAN*) to finalize and generate UPI QR!
                Or reply *CANCEL* to restart.
                """,
                context.getSelectedAssetName(),
                context.getSelectedAssetTag() != null ? context.getSelectedAssetTag() : "",
                hindiName,
                hubInfo,
                context.getRentalDays(),
                context.getStartDate(),
                context.getEndDate(),
                destBadge,
                context.getDeliveryAddress(),
                navLink,
                context.getRentalDays(),
                quote.getBaseRent(),
                quote.getDeliveryFee(),
                quote.getDepositAmount(),
                quote.getTotalAmount(),
                quote.getDepositAmount()
        );

        return WhatsAppMessageResponse.builder()
                .to(conv.getPhoneNumber())
                .message(summary)
                .state(WhatsAppState.CONFIRMING_BOOKING)
                .suggestedOptions(List.of("CONFIRM (हाँ)", "CANCEL (रद्द)"))
                .previewImageUrl(context.getPreviewImageUrl())
                .demoVideoUrl(context.getDemoVideoUrl())
                .build();
    }

    // ─── Booking Confirmation & UPI QR ────────────────────────────────────────

    private WhatsAppMessageResponse handleBookingConfirmation(String input, WhatsAppConversation conv, Customer customer, WhatsAppConversationContext context) {
        String trimmed = input.toUpperCase().trim();

        if (trimmed.equals("CONFIRM") || trimmed.equals("HAAN") || trimmed.equals("YES") || trimmed.equals("OK") || trimmed.equals("1")) {
            String deliveryAddr = context.getDeliveryAddress();
            if (context.getGoogleMapsUrl() != null && !deliveryAddr.contains(context.getGoogleMapsUrl())) {
                deliveryAddr += " | " + context.getGoogleMapsUrl();
            }

            // Create booking in database
            CreateBookingRequest createRequest = CreateBookingRequest.builder()
                    .customerId(customer.getId())
                    .assetId(context.getSelectedAssetId())
                    .startDate(context.getStartDate())
                    .endDate(context.getEndDate())
                    .deliveryAddress(deliveryAddr)
                    .distanceKm(new BigDecimal("15"))
                    .operatorRequired(false)
                    .notes("Booked via WhatsApp by " + customer.getFullName() +
                            (context.getDeliveryDestinationType() != null ? " [" + context.getDeliveryDestinationType() + "]" : "") +
                            (context.getSelectedHubName() != null ? " via " + context.getSelectedHubName() : ""))
                    .build();

            Booking booking = bookingService.createBooking(createRequest, "WHATSAPP_BOT");
            booking = bookingService.updateStatus(booking.getId(), BookingStatus.PENDING_PAYMENT, "Awaiting WhatsApp UPI QR Payment", "WHATSAPP_BOT");
            context.setActiveBookingId(booking.getId());
            context.setActiveBookingNumber(booking.getBookingNumber());

            // Build dynamic UPI QR code
            UpiPaymentDetails upiDetails = upiQrGeneratorService.buildUpiPaymentDetails(
                    booking.getBookingNumber(),
                    booking.getTotalAmount(),
                    "Rent & Deposit for " + booking.getBookingNumber()
            );

            conv.setState(WhatsAppState.AWAITING_PAYMENT);

            String hubNote = context.getSelectedHubName() != null ? "• Assigned Yard: *" + context.getSelectedHubName() + "*\n" : "";
            String navNote = context.getGoogleMapsUrl() != null ? "🗺️ Navigation: " + context.getGoogleMapsUrl() + "\n" : "";

            String hindiName = getEquipmentHindiName(context.getSelectedAssetName(), context.getSelectedAssetTag());

            String confirmationText = String.format("""
                    ✅ *Booking Reserved Successfully!*
                    ━━━━━━━━━━━━━━━━━━━━━━
                    🔖 Booking ID: *%s*
                    🚜 Machine: *%s*
                       👉 *%s*
                    %s📅 Dates: *%s to %s*
                    📍 Location: *%s*
                    %s━━━━━━━━━━━━━━━━━━━━━━
                    💰 Total Amount: *₹%,.2f*
                    _(Deposit: ₹%,.2f + Rent & Logistics: ₹%,.2f)_
                    
                    📲 *Scan Dynamic UPI QR Code to Pay:*
                    Compatible with PhonePe, Google Pay, Paytm, or BHIM.
                    
                    🔗 *Click to Open UPI App directly:*
                    %s
                    
                    🖼️ *View / Download UPI QR Code:*
                    /equipgrid/whatsapp/qr/%s
                    
                    💡 After completing UPI payment, please reply:
                    *PAID* (or enter your 12-digit UPI UTR Number)
                    """,
                    booking.getBookingNumber(),
                    context.getSelectedAssetName(),
                    hindiName,
                    hubNote,
                    booking.getStartDate(),
                    booking.getEndDate(),
                    booking.getDeliveryAddress(),
                    navNote,
                    booking.getTotalAmount(),
                    booking.getDepositAmount(),
                    booking.getTotalAmount().subtract(booking.getDepositAmount()),
                    upiDetails.getUpiUri(),
                    booking.getBookingNumber()
            );

            return WhatsAppMessageResponse.builder()
                    .to(conv.getPhoneNumber())
                    .message(confirmationText)
                    .state(WhatsAppState.AWAITING_PAYMENT)
                    .bookingNumber(booking.getBookingNumber())
                    .upiPayment(upiDetails)
                    .suggestedOptions(List.of("PAID (भुगतान कर दिया)", "MENU"))
                    .previewImageUrl(context.getPreviewImageUrl())
                    .demoVideoUrl(context.getDemoVideoUrl())
                    .build();
        } else if (trimmed.equals("CANCEL") || trimmed.equals("NAHI") || trimmed.equals("NO")) {
            return resetAndShowMainMenu(conv, customer);
        } else {
            return WhatsAppMessageResponse.builder()
                    .to(conv.getPhoneNumber())
                    .message("⚠️ Reply *CONFIRM* to finalize your booking and receive UPI QR, or *CANCEL* to exit.")
                    .state(WhatsAppState.CONFIRMING_BOOKING)
                    .suggestedOptions(List.of("CONFIRM", "CANCEL"))
                    .build();
        }
    }

    // ─── Payment Flow ─────────────────────────────────────────────────────────

    private WhatsAppMessageResponse handlePaymentFlow(String input, WhatsAppConversation conv, Customer customer, WhatsAppConversationContext context) {
        String trimmed = input.toUpperCase().trim();

        Long bookingId = context.getActiveBookingId();
        Booking booking = null;
        if (bookingId != null) {
            booking = bookingQueryRepository.fetchById(bookingId).orElse(null);
        }

        if (booking == null) {
            List<Booking> bookings = bookingQueryRepository.fetchByCustomerId(customer.getId());
            booking = bookings.stream()
                    .filter(b -> b.getStatus() == BookingStatus.PENDING_PAYMENT || b.getStatus() == BookingStatus.QUOTED)
                    .findFirst()
                    .orElse(null);
        }

        if (booking == null) {
            return WhatsAppMessageResponse.builder()
                    .to(conv.getPhoneNumber())
                    .message("ℹ️ No pending payment found for your account.\n\nType *1* to browse machinery or *MENU* for options.")
                    .state(WhatsAppState.MAIN_MENU)
                    .suggestedOptions(List.of("1. Browse & Rent", "MENU"))
                    .build();
        }

        // Check if user submitted proof of payment (PAID or UTR)
        if (trimmed.startsWith("PAID") || trimmed.contains("UTR") || trimmed.matches(".*\\d{6,}.*") || trimmed.equals("DONE")) {
            String txnRef = "UPI-" + System.currentTimeMillis();
            Pattern utrPattern = Pattern.compile("\\b(\\d{8,16})\\b");
            Matcher matcher = utrPattern.matcher(trimmed);
            if (matcher.find()) {
                txnRef = "UPI-" + matcher.group(1);
            }

            // Record security deposit / advance payment
            RecordPaymentRequest paymentReq = RecordPaymentRequest.builder()
                    .bookingId(booking.getId())
                    .amount(booking.getTotalAmount())
                    .paymentType(PaymentType.DEPOSIT)
                    .paymentMode(PaymentMode.UPI)
                    .transactionRef(txnRef)
                    .notes("WhatsApp UPI payment recorded for " + booking.getBookingNumber())
                    .build();

            Payment payment = paymentService.recordPayment(paymentReq, "WHATSAPP_BOT");

            // Update booking status to CONFIRMED
            bookingService.updateStatus(booking.getId(), BookingStatus.CONFIRMED, "Advance & deposit received via WhatsApp UPI QR", "WHATSAPP_BOT");

            conv.setState(WhatsAppState.MAIN_MENU);
            conv.setContextData(null);

            String responseMessage = String.format("""
                    🎉 *Payment Received & Verified!*
                    ━━━━━━━━━━━━━━━━━━━━━━
                    🔖 Booking: *%s*
                    💳 Payment Mode: *UPI*
                    📝 Reference ID: *%s*
                    💰 Amount Paid: *₹%,.2f*
                    ━━━━━━━━━━━━━━━━━━━━━━
                    Status: *CONFIRMED & READY FOR DISPATCH* 🚜
                    
                    Yard technicians are conducting pre-dispatch maintenance inspection. Outward challan will be issued shortly.
                    
                    👉 Type *4* or *TRACK* anytime to view delivery driver & vehicle details!
                    """,
                    booking.getBookingNumber(),
                    payment.getTransactionRef(),
                    payment.getAmount()
            );

            return WhatsAppMessageResponse.builder()
                    .to(conv.getPhoneNumber())
                    .message(responseMessage)
                    .state(WhatsAppState.MAIN_MENU)
                    .bookingNumber(booking.getBookingNumber())
                    .suggestedOptions(List.of("4. Track Status", "MENU"))
                    .build();
        } else {
            // Re-present QR Code and payment details
            UpiPaymentDetails upiDetails = upiQrGeneratorService.buildUpiPaymentDetails(
                    booking.getBookingNumber(),
                    booking.getTotalAmount(),
                    "Rent & Deposit for " + booking.getBookingNumber()
            );

            String payText = String.format("""
                    📲 *UPI Payment for Booking %s*
                    
                    Amount: *₹%,.2f*
                    (Includes 100%% Refundable Security Deposit)
                    
                    🔗 *Click to Open UPI App:*
                    %s
                    
                    👉 Reply *PAID* once completed or enter your 12-digit UPI UTR number.
                    """, booking.getBookingNumber(), booking.getTotalAmount(), upiDetails.getUpiUri());

            return WhatsAppMessageResponse.builder()
                    .to(conv.getPhoneNumber())
                    .message(payText)
                    .state(WhatsAppState.AWAITING_PAYMENT)
                    .bookingNumber(booking.getBookingNumber())
                    .upiPayment(upiDetails)
                    .suggestedOptions(List.of("PAID", "MENU"))
                    .build();
        }
    }

    private WhatsAppMessageResponse initiatePaymentOption(WhatsAppConversation conv, Customer customer, WhatsAppConversationContext context) {
        List<Booking> bookings = bookingQueryRepository.fetchByCustomerId(customer.getId());

        Booking pendingBooking = bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.PENDING_PAYMENT || b.getStatus() == BookingStatus.QUOTED)
                .findFirst()
                .orElse(null);

        if (pendingBooking == null) {
            return WhatsAppMessageResponse.builder()
                    .to(conv.getPhoneNumber())
                    .message("ℹ️ No pending booking awaits payment.\n\nReply *1* to rent equipment or *4* to check existing bookings.")
                    .state(WhatsAppState.MAIN_MENU)
                    .suggestedOptions(List.of("1. Browse & Rent", "4. Track Status", "MENU"))
                    .build();
        }

        context.setActiveBookingId(pendingBooking.getId());
        context.setActiveBookingNumber(pendingBooking.getBookingNumber());
        conv.setState(WhatsAppState.AWAITING_PAYMENT);

        UpiPaymentDetails upiDetails = upiQrGeneratorService.buildUpiPaymentDetails(
                pendingBooking.getBookingNumber(),
                pendingBooking.getTotalAmount(),
                "Rent & Deposit for " + pendingBooking.getBookingNumber()
        );

        String text = String.format("""
                💳 *UPI Payment QR Code for Booking %s*
                ━━━━━━━━━━━━━━━━━━━━━━
                🚜 Machine: *%s*
                💰 Amount Due: *₹%,.2f*
                
                📲 *Scan Dynamic UPI QR Code*
                Supports PhonePe, Google Pay, Paytm, or BHIM.
                
                🔗 *Direct Payment Link:*
                %s
                
                Reply *PAID* after making the payment.
                """,
                pendingBooking.getBookingNumber(),
                pendingBooking.getAsset().getName(),
                pendingBooking.getTotalAmount(),
                upiDetails.getUpiUri()
        );

        return WhatsAppMessageResponse.builder()
                .to(conv.getPhoneNumber())
                .message(text)
                .state(WhatsAppState.AWAITING_PAYMENT)
                .bookingNumber(pendingBooking.getBookingNumber())
                .upiPayment(upiDetails)
                .suggestedOptions(List.of("PAID", "MENU"))
                .build();
    }

    // ─── Dispatch Tracking ────────────────────────────────────────────────────

    private WhatsAppMessageResponse handleTracking(WhatsAppConversation conv, Customer customer) {
        List<Booking> bookings = bookingQueryRepository.fetchByCustomerId(customer.getId());

        if (bookings.isEmpty()) {
            return WhatsAppMessageResponse.builder()
                    .to(conv.getPhoneNumber())
                    .message("ℹ️ You do not have any active or past bookings with EquipGrid.\n\nReply *1* to browse available machinery!")
                    .state(WhatsAppState.MAIN_MENU)
                    .suggestedOptions(List.of("1. Browse & Rent", "MENU"))
                    .build();
        }

        Booking latest = bookings.get(0);
        Optional<DispatchRecord> dispatchOpt = dispatchQueryRepository.fetchByBookingId(latest.getId());

        String hindiName = getEquipmentHindiName(latest.getAsset().getName(), latest.getAsset().getAssetTag());
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("📍 *Live Tracking for Booking %s*\n", latest.getBookingNumber()));
        sb.append("━━━━━━━━━━━━━━━━━━━━━━\n");
        sb.append(String.format("🚜 Machine: *%s* (`%s`)\n", latest.getAsset().getName(), latest.getAsset().getAssetTag()));
        sb.append(String.format("   👉 *%s*\n", hindiName));
        if (latest.getAsset().getHub() != null) {
            sb.append(String.format("🏢 Station: *%s*\n", latest.getAsset().getHub().getName()));
        }
        sb.append(String.format("📊 Status: *%s*\n", formatBookingStatus(latest.getStatus())));
        sb.append(String.format("📅 Period: *%s to %s*\n", latest.getStartDate(), latest.getEndDate()));
        sb.append(String.format("🏡 Delivery To: *%s*\n", latest.getDeliveryAddress()));

        if (dispatchOpt.isPresent()) {
            DispatchRecord dr = dispatchOpt.get();
            sb.append("\n🚚 *Dispatch & Outward Challan Details:*\n");
            sb.append(String.format("• Challan No: *%s*\n", dr.getChallanNumber()));
            if (dr.getDriverName() != null) {
                sb.append(String.format("• Logistics Driver: *%s*\n", dr.getDriverName()));
            }
            if (dr.getFuelLevel() != null) {
                sb.append(String.format("• Outward Fuel Level: *%s*\n", dr.getFuelLevel()));
            }
            if (dr.getEngineHoursOut() != null) {
                sb.append(String.format("• Engine Hours Out: *%s hrs*\n", dr.getEngineHoursOut()));
            }
        } else if (latest.getStatus() == BookingStatus.CONFIRMED || latest.getStatus() == BookingStatus.ALLOCATED) {
            sb.append("\n⏳ *Status*: Payment verified! Machine is allocated in the yard and undergoing dispatch inspection.\n");
        }

        sb.append("\n💡 Reply *MENU* for main options or *5* to request return pickup.");

        return WhatsAppMessageResponse.builder()
                .to(conv.getPhoneNumber())
                .message(sb.toString())
                .state(WhatsAppState.MAIN_MENU)
                .bookingNumber(latest.getBookingNumber())
                .suggestedOptions(List.of("5. Request Return", "MENU"))
                .build();
    }

    // ─── Return & Instant Deposit Refund ──────────────────────────────────────

    private WhatsAppMessageResponse initiateReturnOption(WhatsAppConversation conv, Customer customer, WhatsAppConversationContext context) {
        List<Booking> bookings = bookingQueryRepository.fetchByCustomerId(customer.getId());

        Booking activeOnRent = bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.ON_RENT || b.getStatus() == BookingStatus.DISPATCHED)
                .findFirst()
                .orElse(null);

        if (activeOnRent == null) {
            return WhatsAppMessageResponse.builder()
                    .to(conv.getPhoneNumber())
                    .message("ℹ️ You do not currently have any equipment on rent.\n\nReply *1* to rent new machinery.")
                    .state(WhatsAppState.MAIN_MENU)
                    .suggestedOptions(List.of("1. Browse & Rent", "MENU"))
                    .build();
        }

        context.setActiveBookingId(activeOnRent.getId());
        context.setActiveBookingNumber(activeOnRent.getBookingNumber());
        conv.setState(WhatsAppState.REQUESTING_RETURN);

        String message = String.format("""
                🔄 *Request Equipment Return & Security Deposit Refund*
                *(मशीन वापसी व जमानत राशि वापस पाएं)*
                ━━━━━━━━━━━━━━━━━━━━━━
                🔖 Booking: *%s*
                🚜 Equipment: *%s* (`%s`)
                💰 Security Deposit Held: *₹%,.2f*
                
                📋 *WhatsApp Return Inspection Process:*
                └ 1. Confirm return pickup below
                └ 2. Our bot will guide you through a *quick 8-point damage checklist* 📋
                └ 3. Photo uploads supported for any damage evidence 📷
                └ 4. Instant deposit refund via UPI within 2 hours 💳
                
                🚚 Our recovery vehicle will be dispatched to your site.
                
                👉 Reply *YES* (या *HAAN*) to begin the return & damage inspection process.
                Or reply *MENU* to cancel.
                """,
                activeOnRent.getBookingNumber(),
                activeOnRent.getAsset().getName(),
                activeOnRent.getAsset().getAssetTag(),
                activeOnRent.getDepositAmount()
        );

        return WhatsAppMessageResponse.builder()
                .to(conv.getPhoneNumber())
                .message(message)
                .state(WhatsAppState.REQUESTING_RETURN)
                .bookingNumber(activeOnRent.getBookingNumber())
                .suggestedOptions(List.of("YES (हाँ वापसी करें)", "MENU"))
                .build();
    }

    private WhatsAppMessageResponse handleReturnRequest(String input, WhatsAppConversation conv, Customer customer, WhatsAppConversationContext context) {
        String trimmed = input.toUpperCase().trim();

        if (trimmed.contains("YES") || trimmed.contains("RETURN") || trimmed.contains("WAPAS") ||
                trimmed.contains("HAAN") || trimmed.equals("1")) {
            Long bookingId = context.getActiveBookingId();
            if (bookingId == null) {
                return resetAndShowMainMenu(conv, customer);
            }

            Booking booking = bookingQueryRepository.fetchById(bookingId).orElse(null);
            if (booking == null) {
                return resetAndShowMainMenu(conv, customer);
            }

            // Route to interactive damage checklist instead of direct return
            return startDamageChecklist(conv, customer, context, booking);
        } else {
            return resetAndShowMainMenu(conv, customer);
        }
    }

    private WhatsAppMessageResponse showHelplineResponse(WhatsAppConversation conv) {
        String helpline = """
                📞 *EquipGrid Kisan & Civil Sahayata Helpline*
                ━━━━━━━━━━━━━━━━━━━━━━
                • Toll-Free: *1800-889-AGRI* (24x7)
                • WhatsApp Support: *+91 98765 00000*
                • Active Stations: Hardoi, Lucknow, Kanpur
                
                Services Provided:
                1. On-field breakdown mechanic dispatch
                2. Certified operator booking
                3. Return audit & instant UPI refund queries
                
                👉 Reply *MENU* to return to main options.
                """;

        return WhatsAppMessageResponse.builder()
                .to(conv.getPhoneNumber())
                .message(helpline)
                .state(WhatsAppState.MAIN_MENU)
                .suggestedOptions(List.of("MENU"))
                .build();
    }

    // ─── Voice Note Handler ────────────────────────────────────────────────────

    /**
     * Processes an incoming WhatsApp voice note message.
     * <ol>
     *   <li>Uses Gemini to transcribe audio + parse booking intent</li>
     *   <li>If transcription succeeds, routes intent directly into the booking flow</li>
     *   <li>If transcription fails, sends a friendly retry prompt in Hindi + English</li>
     * </ol>
     *
     * @return A WhatsAppMessageResponse, or {@code null} to fall through to text state machine
     */
    private WhatsAppMessageResponse handleVoiceNoteMessage(
            WhatsAppInboundRequest request,
            WhatsAppConversation conv,
            Customer customer,
            WhatsAppConversationContext context) {

        String senderName = customer.getFullName();
        log.info("[VoiceBot] Received voice note from {} | mediaUrl: {} | preTranscribed: '{}'",
                senderName, request.getMediaUrl(), request.getTranscribedText());

        context.setVoiceNoteReceived(true);
        int retries = context.getVoiceRetryCount() != null ? context.getVoiceRetryCount() : 0;

        VoiceBookingIntent intent;

        // 1. If BSP already transcribed the audio, use that
        if (request.getTranscribedText() != null && !request.getTranscribedText().isBlank()) {
            intent = voiceNoteProcessingService.parseTranscriptIntent(request.getTranscribedText());
            log.info("[VoiceBot] Using pre-transcribed text: '{}'", request.getTranscribedText());
        } else if (request.getMediaUrl() != null && !request.getMediaUrl().isBlank()) {
            // 2. Send audio URL to Gemini for transcription
            intent = voiceNoteProcessingService.processVoiceNote(
                    request.getMediaUrl(), request.getMimeType(), senderName);
        } else {
            // 3. No audio data — prompt for text or voice note with URL
            log.warn("[VoiceBot] No mediaUrl or transcribedText in voice message from {}", senderName);
            return buildVoiceRetryPrompt(conv, customer, "ऑडियो नहीं मिली (Audio not received)", retries);
        }

        if (!intent.isTranscriptionSucceeded() || intent.getTranscript().isBlank()) {
            log.warn("[VoiceBot] Transcription failed for {}: {}", senderName, intent.getFallbackReason());
            context.setVoiceRetryCount(retries + 1);
            if (retries >= 2) {
                // After 3 failed attempts, reset to main menu with text instructions
                return resetAndShowMainMenu(conv, customer);
            }
            return buildVoiceRetryPrompt(conv, customer, intent.getFallbackReason(), retries);
        }

        // ✅ Transcription succeeded
        log.info("[VoiceBot] Transcript: '{}' | Intent: {} | Category: {} | Days: {}",
                intent.getTranscript(), intent.getIntent(), intent.getAssetCategory(), intent.getRentalDays());

        context.setLastVoiceTranscript(intent.getTranscript());
        context.setDetectedLanguage(intent.getDetectedLanguage());
        context.setVoiceRetryCount(0);

        // Apply what was understood to the context
        applyVoiceIntentToContext(intent, context);

        String lang = intent.getDetectedLanguage() != null ? intent.getDetectedLanguage() : "hi";
        String transcriptDisplay = intent.getTranscript();
        String understood = buildVoiceUnderstoodSummary(intent, lang);

        // Route directly based on intent
        String intentCode = intent.getIntent() != null ? intent.getIntent().toUpperCase() : "UNKNOWN";
        switch (intentCode) {
            case "BROWSE_RENT" -> {
                String ack = String.format("""
                        🎤 *आवाज़ सन्देश प्राप्त हुआ!* (Voice Note Received)
                        ━━━━━━━━━━━━━━━━━━━━━━
                        📝 आपने कहा: _%s_
                        
                        %s
                        
                        ✅ समझ गए! अभी मशीन बुकिंग शुरू कर रहे हैं...
                        _(Understood! Starting equipment booking...)_
                        """, transcriptDisplay, understood);

                // Emit acknowledgment first, then route to appropriate state
                conv.setState(WhatsAppState.MAIN_MENU);
                if (context.getAssetCategory() != null && !context.getAssetCategory().isBlank()) {
                    if (context.getRentalDays() != null) {
                        // Both category and days known — go straight to machine listing
                        WhatsAppMessageResponse ackResp = WhatsAppMessageResponse.builder()
                                .to(conv.getPhoneNumber())
                                .message(ack)
                                .state(WhatsAppState.SELECTING_ASSET)
                                .suggestedOptions(List.of("1. Agriculture 🌾", "2. Construction 🏗️"))
                                .build();
                        // Route to machine listing (caller will save context)
                        return displayAvailableMachinery(conv, context);
                    } else {
                        return ackResponseThenState(conv, customer, context, ack,
                                promptRentalDates(conv, context));
                    }
                } else {
                    return ackResponseThenState(conv, customer, context, ack,
                            promptCategorySelection(conv, context));
                }
            }
            case "TRACK_ORDER" -> {
                String ack = String.format("""
                        🎤 *आवाज़ सन्देश प्राप्त हुआ!*
                        📝 _%s_
                        
                        📍 आपकी बुकिंग की स्थिति देख रहे हैं...
                        _(Checking your order status...)_
                        """, transcriptDisplay);
                return ackResponseThenState(conv, customer, context, ack, handleTracking(conv, customer));
            }
            case "PAY" -> {
                String ack = String.format("""
                        🎤 *आवाज़ सन्देश प्राप्त हुआ!*
                        📝 _%s_
                        
                        💳 UPI QR कोड तैयार कर रहे हैं...
                        _(Generating UPI QR code...)_
                        """, transcriptDisplay);
                return ackResponseThenState(conv, customer, context, ack,
                        initiatePaymentOption(conv, customer, context));
            }
            case "RETURN" -> {
                String ack = String.format("""
                        🎤 *आवाज़ सन्देश प्राप्त हुआ!*
                        📝 _%s_
                        
                        🔄 मशीन वापसी प्रक्रिया शुरू कर रहे हैं...
                        _(Initiating machine return...)_
                        """, transcriptDisplay);
                return ackResponseThenState(conv, customer, context, ack,
                        initiateReturnOption(conv, customer, context));
            }
            case "HELP" -> {
                return showHelplineResponse(conv);
            }
            default -> {
                // UNKNOWN intent — show transcript and ask what they want
                String langHint = "hi".equalsIgnoreCase(lang) ? "हिंदी" : "Regional language";
                String msg = String.format("""
                        🎤 *आवाज़ सन्देश सुना गया!* (Voice Note Heard)
                        
                        📝 आपने कहा:
                        _%s_
                        
                        मैं पूरी तरह समझ नहीं पाया। कृपया नीचे से विकल्प चुनें:
                        _(Could not fully understand. Please pick an option:)_
                        
                        *1* 🚜 मशीन बुक करें (Book Equipment)
                        *2* 💳 UPI से पेमेंट करें (Pay via UPI)
                        *3* 📍 ऑर्डर ट्रैक करें (Track Order)
                        *4* 🔄 मशीन वापस करें (Return Machine)
                        *5* 📞 सहायता (Help)
                        
                        _या सीधे टाइप करके बताएं_ / _Or type your message_
                        """, transcriptDisplay);
                conv.setState(WhatsAppState.MAIN_MENU);
                return WhatsAppMessageResponse.builder()
                        .to(conv.getPhoneNumber())
                        .message(msg)
                        .state(WhatsAppState.MAIN_MENU)
                        .suggestedOptions(List.of("1. Book Machine", "2. Pay", "3. Track", "4. Return", "5. Help"))
                        .build();
            }
        }
    }

    private WhatsAppMessageResponse buildVoiceRetryPrompt(WhatsAppConversation conv, Customer customer,
                                                            String reason, int retryCount) {
        conv.setState(WhatsAppState.MAIN_MENU);
        String msg = """
                🎤 *आवाज़ सन्देश नहीं समझ आया* (Could not process voice note)
                ━━━━━━━━━━━━━━━━━━━━━━
                
                🙏 कृपया निम्नलिखित में से कोई एक करें:
                _(Please try one of the following:)_
                
                🎤 *दोबारा आवाज़ भेजें* — थोड़ा धीरे और साफ बोलें
                   _(Send voice note again — speak clearly and slowly)_
                
                ✍️ *टाइप करके बताएं* — जैसे: "concrete mixer 3 din ke liye chahiye"
                   _(Type your request — e.g: "mujhe 2 din ka reaper chahiye")_
                
                📋 *MENU* — मुख्य मेनू देखें
                
                *1* 🚜 मशीन देखें व बुक करें
                *4* 📍 ऑर्डर ट्रैक करें
                *6* 📞 हेल्पलाइन
                """;
        return WhatsAppMessageResponse.builder()
                .to(conv.getPhoneNumber())
                .message(msg)
                .state(WhatsAppState.MAIN_MENU)
                .suggestedOptions(List.of("1. Book Machine", "4. Track", "6. Help", "MENU"))
                .build();
    }

    private String buildVoiceUnderstoodSummary(VoiceBookingIntent intent, String lang) {
        StringBuilder sb = new StringBuilder();
        sb.append("🤖 *समझा (Understood):*\n");
        if (intent.getAssetCategory() != null && !intent.getAssetCategory().isBlank()) {
            sb.append("AGRICULTURE".equals(intent.getAssetCategory())
                    ? "🌾 श्रेणी: कृषि उपकरण (Agriculture)\n"
                    : "🏗️ श्रेणी: निर्माण उपकरण (Construction)\n");
        }
        if (intent.getMachineNameHint() != null && !intent.getMachineNameHint().isBlank()) {
            sb.append("🚜 मशीन: ").append(intent.getMachineNameHint()).append("\n");
        }
        if (intent.getRentalDays() != null && intent.getRentalDays() > 0) {
            sb.append("📅 ").append(intent.getRentalDays()).append(" दिन (Days)\n");
        }
        if (intent.getHubNameHint() != null && !intent.getHubNameHint().isBlank()) {
            sb.append("📍 हब: ").append(intent.getHubNameHint()).append("\n");
        }
        return sb.toString();
    }

    private void applyVoiceIntentToContext(VoiceBookingIntent intent, WhatsAppConversationContext context) {
        if (intent.getAssetCategory() != null && !intent.getAssetCategory().isBlank()) {
            context.setAssetCategory(intent.getAssetCategory());
            context.setSelectedCategory(intent.getAssetCategory());
        }
        if (intent.getRentalDays() != null && intent.getRentalDays() > 0) {
            int days = intent.getRentalDays();
            context.setRentalDays(days);
            LocalDate start = LocalDate.now().plusDays(1);
            context.setStartDate(start);
            context.setEndDate(start.plusDays(days - 1));
        }
        if (intent.getHubNameHint() != null && !intent.getHubNameHint().isBlank()) {
            // Try to match hub name from hint
            String hint = intent.getHubNameHint().toLowerCase();
            hubRepository.findByActiveTrueOrderByNameAsc().stream()
                    .filter(h -> h.getName().toLowerCase().contains(hint) ||
                            (h.getCity() != null && h.getCity().getName().toLowerCase().contains(hint)))
                    .findFirst()
                    .ifPresent(h -> {
                        context.setSelectedHubId(h.getId());
                        context.setSelectedHubName(h.getName());
                        if (h.getCity() != null) context.setSelectedCityName(h.getCity().getName());
                    });
        }
        if (intent.getDeliveryType() != null && !intent.getDeliveryType().isBlank()) {
            context.setDeliveryDestinationType(intent.getDeliveryType());
        }
    }

    /** Returns a combined acknowledgment + next-step response */
    private WhatsAppMessageResponse ackResponseThenState(WhatsAppConversation conv, Customer customer,
                                                          WhatsAppConversationContext context,
                                                          String ackText, WhatsAppMessageResponse nextStep) {
        // In a real BSP integration, you'd send ackText first then nextStep.
        // Here we merge them so the bot returns a single rich message.
        String combined = ackText + "\n\n" + nextStep.getMessage();
        return WhatsAppMessageResponse.builder()
                .to(conv.getPhoneNumber())
                .message(combined)
                .state(nextStep.getState())
                .suggestedOptions(nextStep.getSuggestedOptions())
                .upiPayment(nextStep.getUpiPayment())
                .bookingNumber(nextStep.getBookingNumber())
                .previewImageUrl(nextStep.getPreviewImageUrl())
                .demoVideoUrl(nextStep.getDemoVideoUrl())
                .mediaUrls(nextStep.getMediaUrls())
                .build();
    }

    // ─── Damage Checklist Handler ──────────────────────────────────────────────

    /**
     * Handles a single step of the interactive damage checklist.
     * The checklist is a sequential WhatsApp conversation:
     *   - Bot shows one checklist item at a time
     *   - Customer replies OK / DAMAGED / MISSING / sends a photo
     *   - After all items, generates a completion summary
     */
    private WhatsAppMessageResponse handleDamageChecklistStep(
            WhatsAppInboundRequest request,
            String input,
            WhatsAppConversation conv,
            Customer customer,
            WhatsAppConversationContext context) {

        Long bookingId = context.getActiveBookingId();
        Booking booking = bookingId != null
                ? bookingQueryRepository.fetchById(bookingId).orElse(null)
                : null;

        if (booking == null) {
            log.warn("[DamageChecklist] No active booking found for checklist step from {}", conv.getPhoneNumber());
            return resetAndShowMainMenu(conv, customer);
        }

        String category = booking.getAsset().getCategory() != null
                ? booking.getAsset().getCategory().name() : "CONSTRUCTION";
        List<ChallanDocumentService.ChecklistItem> items = challanDocumentService.getDamageChecklist(category);

        // Initialize state maps if not present
        if (context.getChecklistItemStatuses() == null) context.setChecklistItemStatuses(new HashMap<>());
        if (context.getChecklistItemPhotos() == null) context.setChecklistItemPhotos(new HashMap<>());
        int currentIdx = context.getChecklistCurrentItemIndex() != null ? context.getChecklistCurrentItemIndex() : 0;

        // Check if customer sent a photo for the current item
        boolean photoReceived = isImageMessage(request);
        if (photoReceived && currentIdx < items.size()) {
            ChallanDocumentService.ChecklistItem currentItem = items.get(currentIdx);
            String photoUrl = request.getMediaUrl() != null ? request.getMediaUrl() : "[photo-received]"
                    ;
            context.getChecklistItemPhotos().put(currentItem.key(), photoUrl);
            context.getChecklistItemStatuses().put(currentItem.key(), "DAMAGED");
            log.info("[DamageChecklist] Photo received for item {} from {}", currentItem.key(), conv.getPhoneNumber());
            // Advance to next item
            currentIdx++;
            context.setChecklistCurrentItemIndex(currentIdx);
            return serveNextChecklistItem(items, currentIdx, booking, conv, context);
        }

        // Process text reply
        String upper = input.toUpperCase().trim();
        if (currentIdx < items.size()) {
            ChallanDocumentService.ChecklistItem currentItem = items.get(currentIdx);
            String status;
            if (upper.equals("OK") || upper.equals("THEEK") || upper.equals("THIK") || upper.equals("SAHI")) {
                status = "OK";
            } else if (upper.equals("DAMAGED") || upper.contains("DAMAGE") || upper.contains("TOOTA")
                    || upper.contains("KHARAB") || upper.contains("TUTA")) {
                status = "DAMAGED";
            } else if (upper.equals("MISSING") || upper.contains("MISS") || upper.contains("NAHI")
                    || upper.contains("GAYA") || upper.contains("GAYAB")) {
                status = "MISSING";
            } else if (upper.equals("SKIP")) {
                status = "OK"; // Treat skip as OK
            } else {
                // Unrecognized — re-prompt the same item
                return WhatsAppMessageResponse.builder()
                        .to(conv.getPhoneNumber())
                        .message("⚠️ Reply *OK*, *DAMAGED*, *MISSING*, or send a 📷 photo.\n\n"
                                + challanDocumentService.buildChecklistItemPrompt(
                                currentItem, currentIdx, items.size(),
                                booking.getAsset().getName(), booking.getBookingNumber()))
                        .state(WhatsAppState.DAMAGE_CHECKLIST_ACTIVE)
                        .suggestedOptions(List.of("OK ✅", "DAMAGED ❌", "MISSING ⚠️", "SKIP"))
                        .build();
            }

            context.getChecklistItemStatuses().put(currentItem.key(), status);
            currentIdx++;
            context.setChecklistCurrentItemIndex(currentIdx);
        }

        return serveNextChecklistItem(items, currentIdx, booking, conv, context);
    }

    private WhatsAppMessageResponse serveNextChecklistItem(
            List<ChallanDocumentService.ChecklistItem> items,
            int nextIdx,
            Booking booking,
            WhatsAppConversation conv,
            WhatsAppConversationContext context) {

        if (nextIdx < items.size()) {
            // Still items remaining — show next one
            ChallanDocumentService.ChecklistItem item = items.get(nextIdx);
            String prompt = challanDocumentService.buildChecklistItemPrompt(
                    item, nextIdx, items.size(),
                    booking.getAsset().getName(), booking.getBookingNumber());
            return WhatsAppMessageResponse.builder()
                    .to(conv.getPhoneNumber())
                    .message(prompt)
                    .state(WhatsAppState.DAMAGE_CHECKLIST_ACTIVE)
                    .suggestedOptions(List.of("OK ✅", "DAMAGED ❌", "MISSING ⚠️", "Send Photo 📷"))
                    .build();
        } else {
            // All items done — generate completion summary
            context.setChecklistCompleted(true);
            conv.setState(WhatsAppState.MAIN_MENU);
            String summary = challanDocumentService.buildChecklistCompletionSummary(
                    booking, items,
                    context.getChecklistItemStatuses(),
                    context.getChecklistItemPhotos());

            // Also update booking status to RETURN_REQUESTED
            bookingService.updateStatus(booking.getId(), BookingStatus.RETURN_REQUESTED,
                    "WhatsApp damage checklist completed by customer", "WHATSAPP_BOT");

            log.info("[DamageChecklist] Checklist complete for booking {} from {}",
                    booking.getBookingNumber(), conv.getPhoneNumber());

            return WhatsAppMessageResponse.builder()
                    .to(conv.getPhoneNumber())
                    .message(summary)
                    .state(WhatsAppState.MAIN_MENU)
                    .bookingNumber(booking.getBookingNumber())
                    .suggestedOptions(List.of("1. Rent Again", "MENU"))
                    .build();
        }
    }

    /**
     * Starts the interactive damage checklist for a return flow.
     * Called from {@code initiateReturnOption} when a booking is on-rent.
     */
    private WhatsAppMessageResponse startDamageChecklist(
            WhatsAppConversation conv,
            Customer customer,
            WhatsAppConversationContext context,
            Booking booking) {

        String category = booking.getAsset().getCategory() != null
                ? booking.getAsset().getCategory().name() : "CONSTRUCTION";
        List<ChallanDocumentService.ChecklistItem> items = challanDocumentService.getDamageChecklist(category);

        context.setActiveBookingId(booking.getId());
        context.setActiveBookingNumber(booking.getBookingNumber());
        context.setChecklistCurrentItemIndex(0);
        context.setChecklistItemStatuses(new HashMap<>());
        context.setChecklistItemPhotos(new HashMap<>());
        context.setChecklistCompleted(false);
        conv.setState(WhatsAppState.DAMAGE_CHECKLIST_ACTIVE);

        String intro = String.format("""
                🔄 *Equipment Return — Damage Checklist*
                *(मशीन वापसी — क्षति जाँच सूची)*
                ━━━━━━━━━━━━━━━━━━━━━━
                🚜 Machine: *%s* (`%s`)
                📋 Booking: *%s*
                💰 Security Deposit: *₹%,.0f*
                
                अब मैं आपसे मशीन के %d बिंदुओं की जाँच करूँगा।
                _(I will now check %d inspection points with you.)_
                
                👉 प्रत्येक प्रश्न के लिए उत्तर दें:
                ✅ *OK* — ठीक है
                ❌ *DAMAGED* — क्षतिग्रस्त है  
                ⚠️ *MISSING* — गायब है
                📷 क्षति की *फोटो भेजें*
                
                चलिए शुरू करते हैं! 👇
                """,
                booking.getAsset().getName(), booking.getAsset().getAssetTag(),
                booking.getBookingNumber(),
                booking.getDepositAmount() != null ? booking.getDepositAmount() : BigDecimal.ZERO,
                items.size(), items.size());

        String firstItemPrompt = challanDocumentService.buildChecklistItemPrompt(
                items.get(0), 0, items.size(),
                booking.getAsset().getName(), booking.getBookingNumber());

        return WhatsAppMessageResponse.builder()
                .to(conv.getPhoneNumber())
                .message(intro + "\n\n" + firstItemPrompt)
                .state(WhatsAppState.DAMAGE_CHECKLIST_ACTIVE)
                .bookingNumber(booking.getBookingNumber())
                .suggestedOptions(List.of("OK ✅", "DAMAGED ❌", "MISSING ⚠️", "Send Photo 📷"))
                .build();
    }

    // ─── Helper: detect voice/audio messages ──────────────────────────────────

    private boolean isVoiceMessage(WhatsAppInboundRequest request) {
        if (request.getMediaType() == null) return false;
        String mt = request.getMediaType().toLowerCase();
        return mt.equals("audio") || mt.equals("voice") || mt.startsWith("audio/");
    }

    private boolean isImageMessage(WhatsAppInboundRequest request) {
        if (request.getMediaType() == null) return false;
        String mt = request.getMediaType().toLowerCase();
        return mt.equals("image") || mt.startsWith("image/");
    }

    // ==================== HELPER METHODS ====================

    private String resolveMediaUrl(String s3Key) {
        if (s3Key == null || s3Key.isBlank()) return null;
        try {
            String presigned = storageService.createPreSignedFileUrl(s3Key);
            if (presigned != null && !presigned.isBlank()) return presigned;
        } catch (Exception ignored) {}
        return S3_FALLBACK_BASE + "/" + s3Key;
    }

    private Customer getOrCreateCustomer(String phone, String name) {
        return customerQueryRepository.fetchByPhone(phone).orElseGet(() -> {
            log.info("[WhatsApp Bot] Auto-onboarding customer for phone: {}", phone);
            Customer newCust = Customer.builder()
                    .phone(phone)
                    .fullName(name != null && !name.isBlank() ? name : "Farmer (" + phone + ")")
                    .address("Rural Farm Location (via WhatsApp)")
                    .tier(CustomerTier.TIER_1_BASIC)
                    .verified(false)
                    .notes("Self-registered via WhatsApp service")
                    .build();
            return customerRepository.save(newCust);
        });
    }

    private WhatsAppConversation getOrCreateConversation(String phone) {
        return conversationQueryRepository.fetchByPhone(phone).orElseGet(() -> {
            WhatsAppConversation newConv = WhatsAppConversation.builder()
                    .phoneNumber(phone)
                    .state(WhatsAppState.MAIN_MENU)
                    .lastInteractionAt(LocalDateTime.now())
                    .build();
            return conversationRepository.save(newConv);
        });
    }

    private String normalizePhoneNumber(String raw) {
        if (raw == null) return "";
        String cleaned = raw.replaceAll("[^0-9]", "");
        if (cleaned.length() > 10 && cleaned.startsWith("91")) {
            return cleaned.substring(2);
        }
        return cleaned;
    }

    private boolean isMenuKeyword(String text) {
        if (text == null) return false;
        String upper = text.toUpperCase().trim();
        return upper.equals("MENU") || upper.equals("HI") || upper.equals("HELLO") ||
                upper.equals("NAMASTE") || upper.equals("START") || upper.equals("RESET") ||
                upper.equals("0");
    }

    private boolean isMediaKeyword(String text) {
        if (text == null) return false;
        String upper = text.toUpperCase().trim();
        return upper.equals("VIDEO") || upper.equals("PHOTOS") || upper.equals("PHOTO") || upper.equals("MEDIA");
    }

    private int extractDays(String input) {
        try {
            return Integer.parseInt(input.trim());
        } catch (NumberFormatException e) {
            Pattern pattern = Pattern.compile("(\\d+)");
            Matcher matcher = pattern.matcher(input);
            if (matcher.find()) {
                return Integer.parseInt(matcher.group(1));
            }
            return 0;
        }
    }

    private String formatBookingStatus(BookingStatus status) {
        if (status == null) return "Unknown";
        return switch (status) {
            case QUOTED -> "Quote Prepared";
            case PENDING_PAYMENT -> "Awaiting UPI Payment";
            case CONFIRMED -> "Confirmed (Paid)";
            case ALLOCATED -> "Machine Allocated in Yard";
            case DISPATCH_READY -> "Ready for Farm Dispatch";
            case DISPATCHED -> "Out for Delivery to Farm 🚚";
            case ON_RENT -> "Active on Rent at Farm 🚜";
            case RETURN_REQUESTED -> "Return Pickup Scheduled 🔄";
            case RETURNED -> "Returned to Yard";
            case INSPECTED -> "Inspected & Deposit Refunded ✅";
            case CLOSED -> "Closed";
            case CANCELLED -> "Cancelled";
            default -> status.name();
        };
    }

    private WhatsAppConversationContext parseContext(String json) {
        if (json == null || json.isBlank()) {
            return new WhatsAppConversationContext();
        }
        try {
            return objectMapper.readValue(json, WhatsAppConversationContext.class);
        } catch (Exception e) {
            log.warn("Failed to parse WhatsApp conversation context: {}", e.getMessage());
            return new WhatsAppConversationContext();
        }
    }

    private String serializeContext(WhatsAppConversationContext context) {
        if (context == null) return null;
        try {
            return objectMapper.writeValueAsString(context);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize WhatsApp conversation context: {}", e.getMessage());
            return null;
        }
    }
}
