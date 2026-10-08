package com.equipgrid.intelligence.service;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.asset.repository.AssetQueryRepository;
import com.equipgrid.intelligence.dto.model.EquipmentCardDto;
import com.equipgrid.intelligence.dto.model.IntelligenceChatMessage;
import com.equipgrid.intelligence.dto.request.IntelligenceChatRequest;
import com.equipgrid.intelligence.dto.response.IntelligenceChatResponse;
import com.equipgrid.location.entity.Hub;
import com.equipgrid.location.repository.HubRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class IntelligenceChatServiceImpl implements IIntelligenceChatService {

    private final AssetQueryRepository assetQueryRepository;
    private final HubRepository hubRepository;
    private final ObjectMapper objectMapper;

    @Value("${equipgrid.intelligence.gemini.api-key:}")
    private String configuredGeminiApiKey;

    @Value("${equipgrid.intelligence.gemini.model:gemini-2.5-flash}")
    private String geminiModel;

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Override
    public IntelligenceChatResponse chat(IntelligenceChatRequest request) {
        String userMessage = request.getMessage().trim();
        List<Asset> allAssets = fetchAllAvailableAssets();
        List<Hub> allHubs = hubRepository.findAll();

        // 1. Find equipment that matches the user inquiry
        List<EquipmentCardDto> matchedCards = matchEquipmentToQuery(userMessage, allAssets);

        // 2. Try calling Gemini AI if API key is present
        String apiKey = resolveGeminiApiKey();
        if (StringUtils.isNotBlank(apiKey)) {
            try {
                String geminiReply = callGeminiApi(apiKey, userMessage, request.getConversationHistory(), allAssets, allHubs);
                if (StringUtils.isNotBlank(geminiReply)) {
                    return IntelligenceChatResponse.builder()
                            .reply(geminiReply)
                            .modelUsed("EquipBot Assistant")
                            .matchedEquipment(matchedCards)
                            .suggestedQuestions(buildDynamicSuggestions(userMessage, matchedCards))
                            .primaryActionUrl(determinePrimaryAction(matchedCards))
                            .primaryActionLabel(matchedCards.isEmpty() ? "Explore All Machinery" : "Book Selected Machine")
                            .timestamp(System.currentTimeMillis())
                            .build();
                }
            } catch (Exception e) {
                log.warn("Gemini AI API call failed, falling back to local domain intelligence: {}", e.getMessage());
            }
        }

        // 3. Fallback: Local domain-driven AI knowledge engine
        String localReply = generateLocalDomainReply(userMessage, allAssets, allHubs, matchedCards);
        return IntelligenceChatResponse.builder()
                .reply(localReply)
                .modelUsed("EquipBot Assistant")
                .matchedEquipment(matchedCards)
                .suggestedQuestions(buildDynamicSuggestions(userMessage, matchedCards))
                .primaryActionUrl(determinePrimaryAction(matchedCards))
                .primaryActionLabel(matchedCards.isEmpty() ? "Browse Equipment Fleet" : "Book Machine Now")
                .timestamp(System.currentTimeMillis())
                .build();
    }

    private String resolveGeminiApiKey() {
        if (StringUtils.isNotBlank(configuredGeminiApiKey)) {
            return configuredGeminiApiKey.trim();
        }
        String envKey = System.getenv("GEMINI_API_KEY");
        if (StringUtils.isNotBlank(envKey)) {
            return envKey.trim();
        }
        return null;
    }

    private String callGeminiApi(String apiKey, String userMessage, List<IntelligenceChatMessage> history, List<Asset> assets, List<Hub> hubs) throws Exception {
        String systemInstruction = buildSystemPrompt(assets, hubs);
        String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + geminiModel + ":generateContent?key=" + apiKey;

        ObjectNode root = objectMapper.createObjectNode();

        // System Instruction
        ObjectNode systemInstructionNode = root.putObject("systemInstruction");
        ArrayNode systemParts = systemInstructionNode.putArray("parts");
        systemParts.addObject().put("text", systemInstruction);

        // Contents
        ArrayNode contents = root.putArray("contents");

        // Add history
        if (history != null && !history.isEmpty()) {
            for (IntelligenceChatMessage msg : history) {
                if (StringUtils.isNotBlank(msg.getContent())) {
                    ObjectNode contentNode = contents.addObject();
                    contentNode.put("role", "assistant".equalsIgnoreCase(msg.getRole()) || "model".equalsIgnoreCase(msg.getRole()) ? "model" : "user");
                    ArrayNode parts = contentNode.putArray("parts");
                    parts.addObject().put("text", msg.getContent());
                }
            }
        }

        // Add current user prompt
        ObjectNode currentContent = contents.addObject();
        currentContent.put("role", "user");
        currentContent.putArray("parts").addObject().put("text", userMessage);

        // Generation Config
        ObjectNode genConfig = root.putObject("generationConfig");
        genConfig.put("temperature", 0.4);
        genConfig.put("maxOutputTokens", 800);

        String jsonPayload = objectMapper.writeValueAsString(root);

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .timeout(Duration.ofSeconds(15))
                .build();

        HttpResponse<String> httpResponse = HTTP_CLIENT.send(httpRequest, HttpResponse.BodyHandlers.ofString());

        if (httpResponse.statusCode() >= 200 && httpResponse.statusCode() < 300) {
            JsonNode responseJson = objectMapper.readTree(httpResponse.body());
            JsonNode candidate = responseJson.path("candidates").path(0);
            JsonNode textPart = candidate.path("content").path("parts").path(0).path("text");
            if (!textPart.isMissingNode() && StringUtils.isNotBlank(textPart.asText())) {
                return textPart.asText().trim();
            }
        }

        log.warn("Gemini API returned status {}: {}", httpResponse.statusCode(), httpResponse.body());
        return null;
    }

    private String buildSystemPrompt(List<Asset> assets, List<Hub> hubs) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are the official EquipGrid AI Assistant for EquipGrid (equipgrid.com), India's premier rural and urban heavy machinery rental network operating across Uttar Pradesh (Hardoi, Sandila, Bilgram, and surrounding districts).\n\n");
        sb.append("### Core Brand Guarantees & Features:\n");
        sb.append("1. **2-Hour Security Deposit Refund Guarantee**: Refundable deposits paid via UPI are automatically returned within 120 minutes of machine return inspection with zero deductions.\n");
        sb.append("2. **90-Minute Zero Breakdown SLA**: If a machine faces mechanical failure, our certified mobile technician or replacement machine arrives within 90 minutes.\n");
        sb.append("3. **Farm Field Delivery via GPS**: Farmers and contractors can order from home; tractor-trailers drop machines directly at field headlands or construction sites.\n");
        sb.append("4. **Instant UPI QR Booking**: Instant UPI reservation locking the machine in yard.\n");
        sb.append("5. **Operational Hubs**:\n");
        for (Hub h : hubs) {
            sb.append("   - ").append(h.getName()).append(" (").append(h.getAddress()).append(") - Phone: ").append(h.getContactPhone()).append(", Radius: ").append(h.getOperatingRadiusKm()).append("km\n");
        }
        sb.append("6. **24x7 Helpline**: Toll-free 1800-889-AGRI (1800-889-2474) and WhatsApp: +91 94500 01100.\n\n");

        sb.append("### Current Fleet & Catalog (Live Data):\n");
        for (Asset a : assets) {
            sb.append("- ").append(a.getName()).append(" [Tag: ").append(a.getAssetTag()).append("]");
            sb.append(" | Category: ").append(a.getCategory());
            sb.append(" | Daily Rent: ₹").append(a.getDailyRate()).append("/day");
            sb.append(" | Security Deposit: ₹").append(a.getDepositAmount());
            sb.append(" | Status: ").append(a.getStatus());
            if (a.getHub() != null) {
                sb.append(" | Hub: ").append(a.getHub().getName());
            }
            sb.append("\n");
        }

        sb.append("\n### Instructions for Response:\n");
        sb.append("- Provide clear, courteous, and accurate answers in clean Markdown.\n");
        sb.append("- Support both English and Hinglish/Hindi based on user's query.\n");
        sb.append("- If user asks about rental costs or machinery availability, mention the exact daily rate, security deposit, and our 2-hour refund guarantee.\n");
        sb.append("- Guide user on how to book directly online on the website or via our automated WhatsApp bot.\n");
        sb.append("- Keep responses concise and focused on helping the farmer or contractor.\n");
        return sb.toString();
    }

    private String generateLocalDomainReply(String query, List<Asset> assets, List<Hub> hubs, List<EquipmentCardDto> matched) {
        String lower = query.toLowerCase();

        if (lower.contains("refund") || lower.contains("deposit") || lower.contains("security")) {
            return "### 💰 2-Hour Security Deposit Refund Guarantee\n\n"
                    + "At EquipGrid, your security deposit is **100% safe and hassle-free**:\n\n"
                    + "- **Instant UPI Return**: As soon as your rental period ends, our yard technician completes a rapid 2-minute visual check.\n"
                    + "- **120-Minute Direct Credit**: The full deposit amount is credited back directly to your original UPI ID or bank account within **2 hours (120 minutes)**.\n"
                    + "- **Zero Hidden Deductions**: Transparent billing with no paperwork hassles.\n\n"
                    + "Need assistance with an existing deposit? Our billing desk is on standby at **1800-889-2474**.";
        }

        if (lower.contains("breakdown") || lower.contains("repair") || lower.contains("stopped") || lower.contains("sla") || lower.contains("service")) {
            return "### 🚨 90-Minute Zero-Breakdown Guarantee\n\n"
                    + "We understand that field downtime means lost harvest windows or construction delays:\n\n"
                    + "- **Rapid Mobile Response**: In the rare event of mechanical failure, call **1800-889-AGRI**.\n"
                    + "- **90-Min Resolution SLA**: A certified field technician or a fresh replacement machine will arrive on site within **90 minutes** from our nearest operational hub.\n"
                    + "- **Downtime Credit**: Lost operational hours are automatically credited back to your rental invoice.";
        }

        if (lower.contains("hub") || lower.contains("location") || lower.contains("hardoi") || lower.contains("sandila") || lower.contains("bilgram") || lower.contains("yard")) {
            return "### 📍 EquipGrid Operational Hubs & Delivery Network\n\n"
                    + "We operate 3 regional equipment hubs across Uttar Pradesh with direct field delivery:\n\n"
                    + "1. **Hardoi Central Yard**: Bilgram Road Industrial Area (Serving 30km radius - Shahabad, Tadiyawan) • Phone: `+91 94500 01100`\n"
                    + "2. **Sandila Industrial Hub**: UPSIDC Phase 2, Lucknow-Hardoi Highway (Serving 25km radius - Beniganj, UPSIDC) • Phone: `+91 94500 02200`\n"
                    + "3. **Bilgram Agro Yard**: Near Mandi Parishad (Serving 20km radius - Mallawan, Madhoganj) • Phone: `+91 94500 03300`\n\n"
                    + "🚚 **Doorstep & Field Delivery**: We drop machinery right at your farm GPS headland or construction plot via our tractor-trailer fleet.";
        }

        if (lower.contains("book") || lower.contains("rent") || lower.contains("price") || lower.contains("cost") || !matched.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("### 🚜 Available Machinery & Rental Details\n\n");
            if (!matched.isEmpty()) {
                sb.append("Here is the equipment matching your request from our verified fleet:\n\n");
                for (EquipmentCardDto c : matched) {
                    sb.append("- **").append(c.getName()).append("** (").append(c.getHindiName()).append(")\n");
                    sb.append("  - **Daily Rent**: ₹").append(c.getDailyRate()).append(" / day\n");
                    sb.append("  - **Security Deposit**: ₹").append(c.getDepositAmount()).append(" *(Refunded in 2 hours)*\n");
                    sb.append("  - **Hub**: ").append(c.getHubName()).append(" • Status: **").append(c.getStatus()).append("**\n");
                }
                sb.append("\n👉 You can click **Book Machine Now** below to reserve instantly with dynamic UPI QR code!");
            } else {
                sb.append("We offer a complete fleet of agricultural and construction machinery:\n\n");
                sb.append("- **Agricultural Fleet**: Heavy-duty 7HP Rotary Power Weeders, Walk-Behind Crop Reapers (Paddy/Wheat), Post-Hole Earth Augers.\n");
                sb.append("- **Construction Fleet**: 10/7 Tilting Concrete Mixers (Diesel), Plate Compactors, Concrete Vibrators, Demolition Jackhammers, Dewatering Pumps, Diesel Generators.\n\n");
                sb.append("All rentals include **doorstep farm/site delivery** and a **2-Hour Deposit Refund Guarantee**.");
            }
            return sb.toString();
        }

        return "### Namaste! Welcome to EquipGrid AI Assistant 🙏\n\n"
                + "I can help you search machinery, calculate rental costs, verify delivery to your field GPS, and initiate online bookings.\n\n"
                + "- **🌾 Agriculture**: Power Weeders, Crop Reapers, Earth Augers\n"
                + "- **🏗️ Construction**: Concrete Mixers, Vibrators, Plate Compactors, Demolition Jackhammers\n"
                + "- **⚡ Guarantees**: 2-Hour Deposit Refund & 90-Min Breakdown SLA\n\n"
                + "What machine or project location are you looking for today?";
    }

    private List<EquipmentCardDto> matchEquipmentToQuery(String query, List<Asset> assets) {
        String lower = query.toLowerCase();
        List<Asset> matches = new ArrayList<>();

        for (Asset a : assets) {
            String name = a.getName().toLowerCase();
            String tag = a.getAssetTag().toLowerCase();

            boolean match = false;
            if (lower.contains("weeder") && (name.contains("weeder") || tag.contains("wed"))) match = true;
            else if ((lower.contains("reaper") || lower.contains("harvest") || lower.contains("crop") || lower.contains("paddy") || lower.contains("wheat")) && (name.contains("reaper") || tag.contains("rep"))) match = true;
            else if ((lower.contains("auger") || lower.contains("hole") || lower.contains("digger") || lower.contains("gaddha")) && (name.contains("auger") || tag.contains("aug"))) match = true;
            else if ((lower.contains("mixer") || lower.contains("concrete mixer") || lower.contains("cement")) && (name.contains("mixer") || tag.contains("mix"))) match = true;
            else if ((lower.contains("vibrator") || lower.contains("needle")) && (name.contains("vibrator") || tag.contains("vib"))) match = true;
            else if ((lower.contains("compactor") || lower.contains("roller") || lower.contains("plate")) && (name.contains("compactor") || tag.contains("cmp"))) match = true;
            else if ((lower.contains("hammer") || lower.contains("jackhammer") || lower.contains("demolition") || lower.contains("breaker")) && (name.contains("jackhammer") || tag.contains("jck"))) match = true;
            else if ((lower.contains("pump") || lower.contains("dewater") || lower.contains("water") || lower.contains("trash")) && (name.contains("pump") || tag.contains("pmp"))) match = true;
            else if ((lower.contains("generator") || lower.contains("power") || lower.contains("genset")) && (name.contains("generator") || tag.contains("gen"))) match = true;
            else if (lower.contains("agri") && a.getCategory() == AssetCategory.AGRICULTURE) match = true;
            else if (lower.contains("construction") && a.getCategory() == AssetCategory.CONSTRUCTION) match = true;

            if (match && !matches.contains(a)) {
                matches.add(a);
            }
        }

        return matches.stream().limit(3).map(this::mapToCardDto).collect(Collectors.toList());
    }

    private EquipmentCardDto mapToCardDto(Asset asset) {
        String hindiName = resolveHindiName(asset.getName());
        return EquipmentCardDto.builder()
                .id(asset.getId())
                .assetTag(asset.getAssetTag())
                .name(asset.getName())
                .hindiName(hindiName)
                .category(asset.getCategory().name())
                .dailyRate(asset.getDailyRate())
                .depositAmount(asset.getDepositAmount())
                .status(asset.getStatus().name())
                .hubName(asset.getHub() != null ? asset.getHub().getName() : "Hardoi Central Yard")
                .cityName(asset.getHub() != null && asset.getHub().getCity() != null ? asset.getHub().getCity().getName() : "Hardoi")
                .imageUrl(asset.getImageUrl())
                .bookingUrl("/booking?equipmentId=" + asset.getId())
                .keyFeatures(List.of("Zero-Downtime Guarantee", "2-Hour Deposit Refund", "Doorstep Farm Delivery"))
                .build();
    }

    private String resolveHindiName(String englishName) {
        if (englishName.contains("Mixer")) return "कंक्रीट मिलाने की मशीन (Concrete Mixer)";
        if (englishName.contains("Weeder")) return "खेत की जुताई व निराई-गुड़ाई की मशीन (Power Weeder)";
        if (englishName.contains("Reaper")) return "फसल/धान व गेहूँ काटने की मशीन (Crop Power Reaper)";
        if (englishName.contains("Auger")) return "जमीन में गड्ढा खोदने की मशीन (Post-Hole Earth Auger)";
        if (englishName.contains("Vibrator")) return "कंक्रीट बैठाने/कंपन की मशीन (Concrete Vibrator)";
        if (englishName.contains("Compactor")) return "मिट्टी व रोड़ी कुटाई/दबाने की मशीन (Plate Compactor)";
        if (englishName.contains("Jackhammer")) return "कंक्रीट व पत्थर तोड़ने की मशीन (Demolition Jackhammer)";
        if (englishName.contains("Pump")) return "पानी व कीचड़ निकालने का पम्प (Trash Pump)";
        if (englishName.contains("Generator")) return "बिजली जनरेटर (Portable Generator)";
        return englishName;
    }

    private List<String> buildDynamicSuggestions(String query, List<EquipmentCardDto> matched) {
        List<String> list = new ArrayList<>();
        if (matched.isEmpty()) {
            list.add("🌾 7HP Power Weeder for Sugarcane");
            list.add("🏗️ 10/7 Concrete Mixer for Slab Casting");
            list.add("💰 How does 2-Hour Deposit Refund work?");
            list.add("🚨 90-Min Breakdown SLA Guarantee");
        } else {
            list.add("📅 Check rental availability for next week");
            list.add("🚚 Direct Farm Field delivery charges");
            list.add("💰 Deposit refund timeline");
            list.add("⚡ Emergency 90-Min support");
        }
        return list;
    }

    private String determinePrimaryAction(List<EquipmentCardDto> matched) {
        if (!matched.isEmpty()) {
            return "/booking?equipmentId=" + matched.get(0).getId();
        }
        return "/booking";
    }

    private List<Asset> fetchAllAvailableAssets() {
        try {
            List<Asset> assets = assetQueryRepository.fetchAssets(null, AssetStatus.AVAILABLE);
            if (assets != null && !assets.isEmpty()) {
                return assets;
            }
        } catch (Exception e) {
            log.warn("Could not fetch assets from DB: {}", e.getMessage());
        }
        return buildFallbackAssets();
    }

    private List<Asset> buildFallbackAssets() {
        List<Asset> list = new ArrayList<>();
        list.add(Asset.builder()
                .id(1L)
                .assetTag("C-MIX-001")
                .name("10/7 Tilting Concrete Mixer (Diesel)")
                .category(AssetCategory.CONSTRUCTION)
                .dailyRate(new BigDecimal("1200.00"))
                .depositAmount(new BigDecimal("5000.00"))
                .status(AssetStatus.AVAILABLE)
                .imageUrl("https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=800")
                .build());
        list.add(Asset.builder()
                .id(7L)
                .assetTag("A-WED-001")
                .name("Heavy-Duty 7HP Rotary Power Weeder")
                .category(AssetCategory.AGRICULTURE)
                .dailyRate(new BigDecimal("1000.00"))
                .depositAmount(new BigDecimal("3500.00"))
                .status(AssetStatus.AVAILABLE)
                .imageUrl("https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=800")
                .build());
        list.add(Asset.builder()
                .id(8L)
                .assetTag("A-REP-001")
                .name("Walk-Behind Power Reaper (Paddy/Wheat)")
                .category(AssetCategory.AGRICULTURE)
                .dailyRate(new BigDecimal("2500.00"))
                .depositAmount(new BigDecimal("8000.00"))
                .status(AssetStatus.AVAILABLE)
                .imageUrl("https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800")
                .build());
        list.add(Asset.builder()
                .id(9L)
                .assetTag("A-AUG-001")
                .name("Portable Post-Hole Earth Auger 68cc")
                .category(AssetCategory.AGRICULTURE)
                .dailyRate(new BigDecimal("600.00"))
                .depositAmount(new BigDecimal("2000.00"))
                .status(AssetStatus.AVAILABLE)
                .imageUrl("https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800")
                .build());
        list.add(Asset.builder()
                .id(3L)
                .assetTag("C-VIB-001")
                .name("Petrol Engine Concrete Vibrator")
                .category(AssetCategory.CONSTRUCTION)
                .dailyRate(new BigDecimal("400.00"))
                .depositAmount(new BigDecimal("2000.00"))
                .status(AssetStatus.AVAILABLE)
                .imageUrl("https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=800")
                .build());
        list.add(Asset.builder()
                .id(5L)
                .assetTag("C-CMP-001")
                .name("Forward Plate Compactor 5.5HP")
                .category(AssetCategory.CONSTRUCTION)
                .dailyRate(new BigDecimal("800.00"))
                .depositAmount(new BigDecimal("4000.00"))
                .status(AssetStatus.AVAILABLE)
                .imageUrl("https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800")
                .build());
        return list;
    }
}
