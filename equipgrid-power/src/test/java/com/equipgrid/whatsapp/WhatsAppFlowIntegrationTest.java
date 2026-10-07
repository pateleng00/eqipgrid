package com.equipgrid.whatsapp;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.asset.repository.AssetRepository;
import com.equipgrid.booking.entity.Booking;
import com.equipgrid.booking.enums.BookingStatus;
import com.equipgrid.booking.repository.BookingQueryRepository;
import com.equipgrid.customer.entity.Customer;
import com.equipgrid.customer.repository.CustomerQueryRepository;
import com.equipgrid.whatsapp.dto.request.WhatsAppInboundRequest;
import com.equipgrid.whatsapp.dto.response.WhatsAppMessageResponse;
import com.equipgrid.whatsapp.enums.WhatsAppState;
import com.equipgrid.whatsapp.service.IUpiQrGeneratorService;
import com.equipgrid.whatsapp.service.IWhatsAppBotService;
import com.equipgrid.whatsapp.service.IWhatsAppNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class WhatsAppFlowIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private IWhatsAppBotService whatsAppBotService;

    @Autowired
    private IWhatsAppNotificationService whatsAppNotificationService;

    @Autowired
    private IUpiQrGeneratorService upiQrGeneratorService;

    @Autowired
    private AssetRepository assetRepository;

    @Autowired
    private com.equipgrid.location.repository.StateRepository stateRepository;

    @Autowired
    private com.equipgrid.location.repository.CityRepository cityRepository;

    @Autowired
    private com.equipgrid.location.repository.HubRepository hubRepository;

    @Autowired
    private CustomerQueryRepository customerQueryRepository;

    @Autowired
    private BookingQueryRepository bookingQueryRepository;

    private static final String FARMER_PHONE = "9876501234";

    @BeforeEach
    void setUp() {
        // Reset bot conversation state
        whatsAppBotService.resetConversation(FARMER_PHONE);

        com.equipgrid.location.entity.Hub yard = null;
        if (hubRepository.count() == 0) {
            com.equipgrid.location.entity.State state = stateRepository.findByCodeIgnoreCase("UP")
                    .orElseGet(() -> stateRepository.save(com.equipgrid.location.entity.State.builder()
                            .name("Uttar Pradesh")
                            .code("UP")
                            .active(true)
                            .build()));

            com.equipgrid.location.entity.City city = cityRepository.findAll().stream().findFirst()
                    .orElseGet(() -> cityRepository.save(com.equipgrid.location.entity.City.builder()
                            .name("Hardoi")
                            .state(state)
                            .pinCode("241001")
                            .active(true)
                            .build()));

            yard = com.equipgrid.location.entity.Hub.builder()
                    .name("Hardoi Central Yard")
                    .code("HUB-HRD-01")
                    .city(city)
                    .address("Plot 12, Industrial Area, Bilgram Road, Hardoi")
                    .operatingRadiusKm(new BigDecimal("40.0"))
                    .contactPhone("+91 98765 11111")
                    .active(true)
                    .build();
            yard = hubRepository.save(yard);
        } else {
            yard = hubRepository.findAll().get(0);
        }

        // Ensure available asset exists for test
        if (assetRepository.count() == 0) {
            Asset tractor = Asset.builder()
                    .assetTag("TRAC-001")
                    .name("Sonalika DI 745 III Heavy Tractor")
                    .category(AssetCategory.AGRICULTURE)
                    .modelName("DI 745 III")
                    .serialNumber("SN-SONA-745")
                    .dailyRate(new BigDecimal("1800.00"))
                    .depositAmount(new BigDecimal("5000.00"))
                    .status(AssetStatus.AVAILABLE)
                    .hub(yard)
                    .operatorRequired(false)
                    .engineHours(BigDecimal.ZERO)
                    .build();
            assetRepository.save(tractor);
        }
    }

    @Test
    @DisplayName("End-to-End WhatsApp Lifecycle: Menu -> Category -> Hub -> Catalog with Hindi Name -> Date -> Location -> Quote -> Book -> UPI QR -> Pay -> Track")
    void testCompleteWhatsAppRentalLifecycle() {
        // 1. Initial Greeting / Menu
        WhatsAppInboundRequest req1 = WhatsAppInboundRequest.builder()
                .from(FARMER_PHONE)
                .userName("Ramesh Patel")
                .message("NAMASTE")
                .build();
        WhatsAppMessageResponse resp1 = whatsAppBotService.processIncomingMessage(req1);
        assertNotNull(resp1);
        assertEquals(WhatsAppState.MAIN_MENU, resp1.getState());
        assertTrue(resp1.getMessage().contains("EquipGrid Rentals"));
        assertTrue(resp1.getMessage().contains("Browse Machinery & Rent"));

        // Verify customer auto-creation by phone number
        Optional<Customer> customerOpt = customerQueryRepository.fetchByPhone(FARMER_PHONE);
        assertTrue(customerOpt.isPresent(), "Customer should be auto-identified and onboarded by mobile phone");
        assertEquals("Ramesh Patel", customerOpt.get().getFullName());

        // 2. Select Option 1 (Browse Machinery) -> Prompts for Category
        WhatsAppInboundRequest req2 = WhatsAppInboundRequest.builder()
                .from(FARMER_PHONE)
                .message("1")
                .build();
        WhatsAppMessageResponse resp2 = whatsAppBotService.processIncomingMessage(req2);
        assertNotNull(resp2);
        assertEquals(WhatsAppState.SELECTING_CATEGORY, resp2.getState());
        assertTrue(resp2.getMessage().contains("Agriculture Machinery"));
        assertTrue(resp2.getMessage().contains("Construction Equipment"));

        // 2b. Select Option 1 (Agriculture) -> Prompts for Station Hub
        WhatsAppInboundRequest req2b = WhatsAppInboundRequest.builder()
                .from(FARMER_PHONE)
                .message("1")
                .build();
        WhatsAppMessageResponse resp2b = whatsAppBotService.processIncomingMessage(req2b);
        assertNotNull(resp2b);
        assertEquals(WhatsAppState.SELECTING_HUB, resp2b.getState());
        assertTrue(resp2b.getMessage().contains("Station Hub"));

        // 2c. Select Station Hub 1 -> Prompts for Rental Duration / Dates
        WhatsAppInboundRequest req2c = WhatsAppInboundRequest.builder()
                .from(FARMER_PHONE)
                .message("1")
                .build();
        WhatsAppMessageResponse resp2c = whatsAppBotService.processIncomingMessage(req2c);
        assertNotNull(resp2c);
        assertEquals(WhatsAppState.ENTERING_DATES, resp2c.getState());
        assertTrue(resp2c.getMessage().contains("Rental Duration"));

        // 3. Enter Rental Duration (3 days) -> Displays only collision-free Agriculture machines with Hindi names
        WhatsAppInboundRequest req3 = WhatsAppInboundRequest.builder()
                .from(FARMER_PHONE)
                .message("3")
                .build();
        WhatsAppMessageResponse resp3 = whatsAppBotService.processIncomingMessage(req3);
        assertNotNull(resp3);
        assertEquals(WhatsAppState.SELECTING_ASSET, resp3.getState());
        assertTrue(resp3.getMessage().contains("Agriculture Machinery"));
        assertTrue(resp3.getMessage().contains("TRAC-001"));
        assertTrue(resp3.getMessage().contains("खेत जुताई ट्रैक्टर (Farm Tractor)"));

        // 4. Select Machine #1 (Tractor) -> Dates already known, directly shows machine media & prompts Agriculture destination (Home vs Farm)
        WhatsAppInboundRequest req4 = WhatsAppInboundRequest.builder()
                .from(FARMER_PHONE)
                .message("1")
                .build();
        WhatsAppMessageResponse resp4 = whatsAppBotService.processIncomingMessage(req4);
        assertNotNull(resp4);
        assertEquals(WhatsAppState.SELECTING_DELIVERY_DESTINATION, resp4.getState());
        assertTrue(resp4.getMessage().contains("Selected: Sonalika DI 745 III Heavy Tractor"));
        assertTrue(resp4.getMessage().contains("खेत जुताई ट्रैक्टर (Farm Tractor)"));
        assertTrue(resp4.getMessage().contains("Where do you need this equipment delivered?"));
        assertTrue(resp4.getMessage().contains("Direct Farm / Field"));

        // 4b. Select Option 2: Direct Farm / Field Geo-Tag
        WhatsAppInboundRequest req4b = WhatsAppInboundRequest.builder()
                .from(FARMER_PHONE)
                .message("2")
                .build();
        WhatsAppMessageResponse resp4b = whatsAppBotService.processIncomingMessage(req4b);
        assertNotNull(resp4b);
        assertEquals(WhatsAppState.ENTERING_LOCATION, resp4b.getState());
        assertTrue(resp4b.getMessage().contains("Direct Farm / Field (Khet) Geo-Tag"));
        assertTrue(resp4b.getMessage().contains("Location Pin"));

        // 5. Send Farm WhatsApp Location Pin (Geo-Tag with GPS Coordinates)
        WhatsAppInboundRequest req5 = WhatsAppInboundRequest.builder()
                .from(FARMER_PHONE)
                .latitude(27.3981)
                .longitude(80.1324)
                .locationName("Rampur Sharda Canal Farm Gate")
                .build();
        WhatsAppMessageResponse resp5 = whatsAppBotService.processIncomingMessage(req5);
        assertNotNull(resp5);
        assertEquals(WhatsAppState.CONFIRMING_BOOKING, resp5.getState());
        assertTrue(resp5.getMessage().contains("Quotation Summary"));
        assertTrue(resp5.getMessage().contains("Direct Farm Geo-Tag"));
        assertTrue(resp5.getMessage().contains("https://www.google.com/maps?q=27.3981,80.1324"));
        assertTrue(resp5.getMessage().contains("Security Deposit (100% Refundable)"));
        assertTrue(resp5.getMessage().contains("CONFIRM"));

        // 6. Confirm Booking -> Creates Booking & Generates Dynamic UPI QR Code
        WhatsAppInboundRequest req6 = WhatsAppInboundRequest.builder()
                .from(FARMER_PHONE)
                .message("CONFIRM")
                .build();
        WhatsAppMessageResponse resp6 = whatsAppBotService.processIncomingMessage(req6);
        assertNotNull(resp6);
        assertEquals(WhatsAppState.AWAITING_PAYMENT, resp6.getState());
        assertNotNull(resp6.getBookingNumber());
        assertNotNull(resp6.getUpiPayment(), "UPI payment details must be generated");
        assertTrue(resp6.getUpiPayment().getUpiUri().startsWith("upi://pay?pa="));
        assertNotNull(resp6.getUpiPayment().getQrCodeBase64(), "QR code Base64 image data URI must be present");
        assertTrue(resp6.getUpiPayment().getQrCodeBase64().startsWith("data:image/png;base64,"));

        String bookingNumber = resp6.getBookingNumber();

        // 7. Verify booking persisted in database
        Optional<Booking> bookingOpt = bookingQueryRepository.fetchByBookingNumber(bookingNumber);
        assertTrue(bookingOpt.isPresent());
        Booking booking = bookingOpt.get();
        assertEquals(customerOpt.get().getId(), booking.getCustomer().getId());
        assertEquals(BookingStatus.PENDING_PAYMENT, booking.getStatus());

        // 8. Test HTTP endpoint for UPI QR code PNG download / rendering
        String qrUrl = "http://localhost:" + port + "/equipgrid/whatsapp/qr/" + bookingNumber;
        ResponseEntity<byte[]> qrResponse = restTemplate.getForEntity(qrUrl, byte[].class);
        assertEquals(HttpStatus.OK, qrResponse.getStatusCode());
        assertEquals(MediaType.IMAGE_PNG, qrResponse.getHeaders().getContentType());
        assertNotNull(qrResponse.getBody());
        assertTrue(qrResponse.getBody().length > 100, "PNG image bytes must be valid");

        // 9. Farmer completes UPI payment and replies with UTR reference
        WhatsAppInboundRequest req7 = WhatsAppInboundRequest.builder()
                .from(FARMER_PHONE)
                .message("PAID UTR-202610058899")
                .build();
        WhatsAppMessageResponse resp7 = whatsAppBotService.processIncomingMessage(req7);
        assertNotNull(resp7);
        assertEquals(WhatsAppState.MAIN_MENU, resp7.getState());
        assertTrue(resp7.getMessage().contains("Payment Received & Verified"));
        assertTrue(resp7.getMessage().contains("CONFIRMED & READY FOR DISPATCH"));

        // Verify booking status transitioned to CONFIRMED
        Booking updatedBooking = bookingQueryRepository.fetchById(booking.getId()).orElseThrow();
        assertEquals(BookingStatus.CONFIRMED, updatedBooking.getStatus());

        // 10. Farmer checks tracking status via WhatsApp (Option 4)
        WhatsAppInboundRequest req8 = WhatsAppInboundRequest.builder()
                .from(FARMER_PHONE)
                .message("4")
                .build();
        WhatsAppMessageResponse resp8 = whatsAppBotService.processIncomingMessage(req8);
        assertNotNull(resp8);
        assertTrue(resp8.getMessage().contains("Live Tracking for Booking"));
        assertTrue(resp8.getMessage().contains(bookingNumber));
        assertTrue(resp8.getMessage().contains("Confirmed"));

        // 11. Test Proactive Outbound Notification Service
        WhatsAppMessageResponse notif = whatsAppNotificationService.notifyBookingCreated(booking.getId());
        assertNotNull(notif);
        assertTrue(notif.getMessage().contains("EquipGrid Booking Alert"));
        assertTrue(notif.getMessage().contains(bookingNumber));
        assertNotNull(notif.getUpiPayment());
    }

    @Test
    @DisplayName("UPI QR Code Generator Unit Verification")
    void testUpiQrGeneratorService() {
        String uri = upiQrGeneratorService.generateUpiPaymentUri(
                "equipgrid@upi",
                "EquipGrid Rentals",
                new BigDecimal("12500.00"),
                "Security Deposit BK-9999",
                "BK-9999"
        );
        assertTrue(uri.contains("pa=equipgrid@upi"));
        assertTrue(uri.contains("am=12500.00"));
        assertTrue(uri.contains("cu=INR"));

        byte[] png = upiQrGeneratorService.generateQrCodeBytes(uri, 300, 300);
        assertNotNull(png);
        assertTrue(png.length > 50);

        String b64 = upiQrGeneratorService.generateQrCodeBase64(uri, 300, 300);
        assertTrue(b64.startsWith("data:image/png;base64,"));
    }

    @Test
    @DisplayName("Construction Machine Flow: Directly prompts for Site location without Home/Farm question")
    void testConstructionSiteLocationFlow() {
        String contractorPhone = "9876599999";
        whatsAppBotService.resetConversation(contractorPhone);

        // Ensure construction asset exists
        Asset mixer = Asset.builder()
                .assetTag("C-MIX-099")
                .name("Tata Concrete Mixer 10/7")
                .category(AssetCategory.CONSTRUCTION)
                .modelName("10/7 CFT")
                .serialNumber("SN-MIX-099")
                .dailyRate(new BigDecimal("1200.00"))
                .depositAmount(new BigDecimal("3000.00"))
                .status(AssetStatus.AVAILABLE)
                .hub(hubRepository.findAll().get(0))
                .operatorRequired(false)
                .engineHours(BigDecimal.ZERO)
                .build();
        assetRepository.save(mixer);

        // 1. Initial Menu -> Select 1 (Browse Machinery)
        WhatsAppInboundRequest req1 = WhatsAppInboundRequest.builder()
                .from(contractorPhone)
                .userName("Vikram Construction")
                .message("1")
                .build();
        WhatsAppMessageResponse resp1 = whatsAppBotService.processIncomingMessage(req1);
        assertEquals(WhatsAppState.SELECTING_CATEGORY, resp1.getState());
        assertTrue(resp1.getMessage().contains("Construction Equipment"));

        // 1b. Select Category 2 (Construction) -> Prompts for Hub
        WhatsAppInboundRequest req1b = WhatsAppInboundRequest.builder()
                .from(contractorPhone)
                .message("2")
                .build();
        WhatsAppMessageResponse resp1b = whatsAppBotService.processIncomingMessage(req1b);
        assertEquals(WhatsAppState.SELECTING_HUB, resp1b.getState());
        assertTrue(resp1b.getMessage().contains("Station Hub"));

        // 1c. Select Hub 1 (Hardoi Central Yard) -> Prompts for Rental Dates
        WhatsAppInboundRequest req1c = WhatsAppInboundRequest.builder()
                .from(contractorPhone)
                .message("1")
                .build();
        WhatsAppMessageResponse resp1c = whatsAppBotService.processIncomingMessage(req1c);
        assertEquals(WhatsAppState.ENTERING_DATES, resp1c.getState());
        assertTrue(resp1c.getMessage().contains("Rental Duration"));

        // 2. Enter Duration (5 days) -> Displays Construction Machinery free for that date window
        WhatsAppInboundRequest req2 = WhatsAppInboundRequest.builder()
                .from(contractorPhone)
                .message("5")
                .build();
        WhatsAppMessageResponse resp2 = whatsAppBotService.processIncomingMessage(req2);
        assertEquals(WhatsAppState.SELECTING_ASSET, resp2.getState());
        assertTrue(resp2.getMessage().contains("Construction Equipment"));
        assertTrue(resp2.getMessage().contains("कंक्रीट मिलाने की मशीन (Concrete Mixer)"));

        // 3. Select Concrete Mixer -> Dates already known, directly prompts for Construction Site location
        WhatsAppInboundRequest req3 = WhatsAppInboundRequest.builder()
                .from(contractorPhone)
                .message("C-MIX-099")
                .build();
        WhatsAppMessageResponse resp3 = whatsAppBotService.processIncomingMessage(req3);
        assertEquals(WhatsAppState.ENTERING_LOCATION, resp3.getState());
        assertTrue(resp3.getMessage().contains("कंक्रीट मिलाने की मशीन (Concrete Mixer)"));
        assertTrue(resp3.getMessage().contains("Construction Site Delivery Location"));
        assertTrue(resp3.getMessage().contains("Option A:* Share WhatsApp Location Pin"));
        assertTrue(resp3.getMessage().contains("Option B:* Type Site Address"));

        // 4. Contractor types site address
        WhatsAppInboundRequest req4 = WhatsAppInboundRequest.builder()
                .from(contractorPhone)
                .message("Highway Project Site Km 42, Lucknow Bypass")
                .build();
        WhatsAppMessageResponse resp4 = whatsAppBotService.processIncomingMessage(req4);
        assertEquals(WhatsAppState.CONFIRMING_BOOKING, resp4.getState());
        assertTrue(resp4.getMessage().contains("Construction Site"));
        assertTrue(resp4.getMessage().contains("Highway Project Site Km 42"));
        assertTrue(resp4.getMessage().contains("कंक्रीट मिलाने की मशीन (Concrete Mixer)"));
    }
}
