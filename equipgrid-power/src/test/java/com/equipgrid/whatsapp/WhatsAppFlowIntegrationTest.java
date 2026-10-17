package com.equipgrid.whatsapp;

import static org.junit.jupiter.api.Assertions.*;

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
import java.math.BigDecimal;
import java.util.Optional;
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

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class WhatsAppFlowIntegrationTest {

  @LocalServerPort private int port;

  @Autowired private TestRestTemplate restTemplate;

  @Autowired private IWhatsAppBotService whatsAppBotService;

  @Autowired private IWhatsAppNotificationService whatsAppNotificationService;

  @Autowired private IUpiQrGeneratorService upiQrGeneratorService;

  @Autowired private AssetRepository assetRepository;

  @Autowired private com.equipgrid.location.repository.StateRepository stateRepository;

  @Autowired
  private com.equipgrid.location.repository.LocationQueryRepository locationQueryRepository;

  @Autowired private com.equipgrid.location.repository.CityRepository cityRepository;

  @Autowired private com.equipgrid.location.repository.HubRepository hubRepository;

  @Autowired
  private com.equipgrid.master.repository.EquipmentTypeRepository equipmentTypeRepository;

  @Autowired private com.equipgrid.master.repository.ManufacturerRepository manufacturerRepository;

  @Autowired private com.equipgrid.master.repository.MachineModelRepository machineModelRepository;

  @Autowired private CustomerQueryRepository customerQueryRepository;

  @Autowired private com.equipgrid.customer.repository.CustomerRepository customerRepository;

  @Autowired
  private com.equipgrid.farmlocation.repository.FarmLocationRepository farmLocationRepository;

  @Autowired private BookingQueryRepository bookingQueryRepository;

  @Autowired private com.equipgrid.booking.service.IBookingService bookingService;

  @Autowired
  private com.equipgrid.whatsapp.service.VoiceNoteProcessingService voiceNoteProcessingService;

  private static final String FARMER_PHONE = "9876501234";

  @BeforeEach
  void setUp() {
    // Reset bot conversation state
    whatsAppBotService.resetConversation(FARMER_PHONE);

    com.equipgrid.location.entity.Hub yard = null;
    if (hubRepository.count() == 0) {
      com.equipgrid.location.entity.State state =
          locationQueryRepository
              .findStateByCode("UP")
              .orElseGet(
                  () ->
                      stateRepository.save(
                          com.equipgrid.location.entity.State.builder()
                              .name("Uttar Pradesh")
                              .code("UP")
                              .active(true)
                              .build()));

      com.equipgrid.location.entity.City city =
          cityRepository.findAll().stream()
              .findFirst()
              .orElseGet(
                  () ->
                      cityRepository.save(
                          com.equipgrid.location.entity.City.builder()
                              .name("Hardoi")
                              .state(state)
                              .pinCode("241001")
                              .active(true)
                              .build()));

      yard =
          com.equipgrid.location.entity.Hub.builder()
              .name("Hardoi Central Yard")
              .code("HUB-HRD-01")
              .city(city)
              .address("Plot 12, Industrial Area, Bilgram Road, Hardoi")
              .operatingRadiusKm(new BigDecimal("40.0"))
              .latitude(new BigDecimal("27.3984"))
              .longitude(new BigDecimal("80.1287"))
              .contactPhone("+91 98765 11111")
              .active(true)
              .build();
      yard = hubRepository.save(yard);
    } else {
      yard = hubRepository.findAll().get(0);
    }

    // Ensure available asset exists for test
    if (assetRepository.count() == 0) {
      com.equipgrid.master.entity.EquipmentType type =
          equipmentTypeRepository.findAll().stream()
              .filter(t -> "TRAC-HEAVY".equalsIgnoreCase(t.getCode()))
              .findFirst()
              .map(
                  t -> {
                    if (t.getHindiName() == null) {
                      t.setHindiName("खेत जुताई ट्रैक्टर (Farm Tractor)");
                      return equipmentTypeRepository.save(t);
                    }
                    return t;
                  })
              .orElseGet(
                  () ->
                      equipmentTypeRepository.save(
                          com.equipgrid.master.entity.EquipmentType.builder()
                              .name("Heavy Tractor")
                              .code("TRAC-HEAVY")
                              .category(AssetCategory.AGRICULTURE)
                              .hindiName("खेत जुताई ट्रैक्टर (Farm Tractor)")
                              .build()));

      com.equipgrid.master.entity.Manufacturer mfg =
          manufacturerRepository.findAll().stream()
              .filter(m -> "MFG-SONALIKA".equalsIgnoreCase(m.getCode()))
              .findFirst()
              .orElseGet(
                  () ->
                      manufacturerRepository.save(
                          com.equipgrid.master.entity.Manufacturer.builder()
                              .name("Sonalika")
                              .code("MFG-SONALIKA")
                              .build()));

      com.equipgrid.master.entity.MachineModel model =
          machineModelRepository.findAll().stream()
              .filter(m -> "DI-745".equalsIgnoreCase(m.getModelNumber()))
              .findFirst()
              .orElseGet(
                  () ->
                      machineModelRepository.save(
                          com.equipgrid.master.entity.MachineModel.builder()
                              .name("Sonalika DI 745 III Heavy Tractor")
                              .modelNumber("DI-745")
                              .type(type)
                              .manufacturer(mfg)
                              .build()));

      Asset tractor =
          Asset.builder()
              .assetTag("TRAC-001")
              .name("Sonalika DI 745 III Heavy Tractor")
              .category(AssetCategory.AGRICULTURE)
              .imageUrl("https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800")
              .model(model)
              .type(type)
              .manufacturer(mfg)
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
  @DisplayName(
      "End-to-End WhatsApp Lifecycle: Menu -> Category -> Hub -> Catalog with Hindi Name -> Date -> Location -> Quote -> Book -> UPI QR -> Pay -> Track")
  void testCompleteWhatsAppRentalLifecycle() {
    // 1. Initial Greeting / Menu
    WhatsAppInboundRequest req1 =
        WhatsAppInboundRequest.builder()
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
    assertTrue(
        customerOpt.isPresent(),
        "Customer should be auto-identified and onboarded by mobile phone");
    assertEquals("Ramesh Patel", customerOpt.get().getFullName());

    // 2. Select Option 1 (Browse Machinery) -> Prompts for Category
    WhatsAppInboundRequest req2 =
        WhatsAppInboundRequest.builder().from(FARMER_PHONE).message("1").build();
    WhatsAppMessageResponse resp2 = whatsAppBotService.processIncomingMessage(req2);
    assertNotNull(resp2);
    assertEquals(WhatsAppState.SELECTING_CATEGORY, resp2.getState());
    assertTrue(resp2.getMessage().contains("Agriculture Machinery"));
    assertTrue(resp2.getMessage().contains("Construction Equipment"));

    // 2b. Select Option 1 (Agriculture) -> Prompts for Station Hub
    WhatsAppInboundRequest req2b =
        WhatsAppInboundRequest.builder().from(FARMER_PHONE).message("1").build();
    WhatsAppMessageResponse resp2b = whatsAppBotService.processIncomingMessage(req2b);
    assertNotNull(resp2b);
    assertEquals(WhatsAppState.SELECTING_HUB, resp2b.getState());
    assertTrue(resp2b.getMessage().contains("Station Hub"));

    // 2c. Select Station Hub 1 -> Prompts for Rental Duration / Dates
    WhatsAppInboundRequest req2c =
        WhatsAppInboundRequest.builder().from(FARMER_PHONE).message("1").build();
    WhatsAppMessageResponse resp2c = whatsAppBotService.processIncomingMessage(req2c);
    assertNotNull(resp2c);
    assertEquals(WhatsAppState.ENTERING_DATES, resp2c.getState());
    assertTrue(resp2c.getMessage().contains("Rental Duration"));

    // 3. Enter Rental Duration (3 days) -> Displays only collision-free Agriculture machines with
    // Hindi names
    WhatsAppInboundRequest req3 =
        WhatsAppInboundRequest.builder().from(FARMER_PHONE).message("3").build();
    WhatsAppMessageResponse resp3 = whatsAppBotService.processIncomingMessage(req3);
    assertNotNull(resp3);
    assertEquals(WhatsAppState.SELECTING_ASSET, resp3.getState());
    assertTrue(resp3.getMessage().contains("Agriculture Machinery"));
    assertTrue(resp3.getMessage().contains("TRAC-001"));
    assertTrue(resp3.getMessage().contains("खेत जुताई ट्रैक्टर (Farm Tractor)"));

    // 4. Select Machine #1 (Tractor) -> Dates already known, directly shows machine media & prompts
    // Agriculture destination (Home vs Farm)
    WhatsAppInboundRequest req4 =
        WhatsAppInboundRequest.builder().from(FARMER_PHONE).message("1").build();
    WhatsAppMessageResponse resp4 = whatsAppBotService.processIncomingMessage(req4);
    assertNotNull(resp4);
    assertEquals(WhatsAppState.SELECTING_DELIVERY_DESTINATION, resp4.getState());
    assertTrue(resp4.getMessage().contains("Selected: Sonalika DI 745 III Heavy Tractor"));
    assertTrue(resp4.getMessage().contains("खेत जुताई ट्रैक्टर (Farm Tractor)"));
    assertTrue(resp4.getMessage().contains("Where do you need this equipment delivered?"));
    assertTrue(resp4.getMessage().contains("Direct Farm / Field"));

    // 4b. Select Option 2: Direct Farm / Field Geo-Tag
    WhatsAppInboundRequest req4b =
        WhatsAppInboundRequest.builder().from(FARMER_PHONE).message("2").build();
    WhatsAppMessageResponse resp4b = whatsAppBotService.processIncomingMessage(req4b);
    assertNotNull(resp4b);
    assertEquals(WhatsAppState.ENTERING_LOCATION, resp4b.getState());
    assertTrue(resp4b.getMessage().contains("Direct Farm / Field (Khet) Geo-Tag"));
    assertTrue(resp4b.getMessage().contains("Location Pin"));

    // 5. Send Farm WhatsApp Location Pin (Geo-Tag with GPS Coordinates)
    WhatsAppInboundRequest req5 =
        WhatsAppInboundRequest.builder()
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
    WhatsAppInboundRequest req6 =
        WhatsAppInboundRequest.builder().from(FARMER_PHONE).message("CONFIRM").build();
    WhatsAppMessageResponse resp6 = whatsAppBotService.processIncomingMessage(req6);
    assertNotNull(resp6);
    assertEquals(WhatsAppState.AWAITING_PAYMENT, resp6.getState());
    assertNotNull(resp6.getBookingNumber());
    assertNotNull(resp6.getUpiPayment(), "UPI payment details must be generated");
    assertTrue(resp6.getUpiPayment().getUpiUri().startsWith("upi://pay?pa="));
    assertNotNull(
        resp6.getUpiPayment().getQrCodeBase64(), "QR code Base64 image data URI must be present");
    assertTrue(resp6.getUpiPayment().getQrCodeBase64().startsWith("data:image/png;base64,"));

    String bookingNumber = resp6.getBookingNumber();

    // 7. Verify booking persisted in database
    Optional<Booking> bookingOpt = bookingQueryRepository.fetchByBookingNumber(bookingNumber);
    assertTrue(bookingOpt.isPresent());
    Booking booking = bookingOpt.get();
    assertEquals(customerOpt.get().getId(), booking.getCustomer().getId());
    assertEquals(BookingStatus.PENDING_PAYMENT, booking.getStatus());

    // 8. Test HTTP endpoint for UPI QR code PNG download / rendering
    String qrUrl = "/whatsapp/qr/" + bookingNumber;
    ResponseEntity<byte[]> qrResponse = restTemplate.getForEntity(qrUrl, byte[].class);
    if (qrResponse.getStatusCode() != HttpStatus.OK) {
      System.err.println(
          "QR Request Failed: "
              + qrResponse.getStatusCode()
              + ", Headers: "
              + qrResponse.getHeaders()
              + ", Body: "
              + (qrResponse.getBody() != null ? new String(qrResponse.getBody()) : "null"));
    }
    assertEquals(HttpStatus.OK, qrResponse.getStatusCode());
    assertEquals(MediaType.IMAGE_PNG, qrResponse.getHeaders().getContentType());
    assertNotNull(qrResponse.getBody());
    assertTrue(qrResponse.getBody().length > 100, "PNG image bytes must be valid");

    // 9. A farmer-submitted UTR is retained as payment proof, not treated as payment verification.
    WhatsAppInboundRequest req7 =
        WhatsAppInboundRequest.builder()
            .from(FARMER_PHONE)
            .message("PAID UTR-202610058899")
            .build();
    WhatsAppMessageResponse resp7 = whatsAppBotService.processIncomingMessage(req7);
    assertNotNull(resp7);
    assertEquals(WhatsAppState.MAIN_MENU, resp7.getState());
    assertTrue(resp7.getMessage().contains("Payment Details Received"));
    assertTrue(resp7.getMessage().contains("Payment verification in progress"));

    // Verify station/gateway reconciliation is still required before confirmation.
    Booking updatedBooking = bookingQueryRepository.fetchById(booking.getId()).orElseThrow();
    assertEquals(BookingStatus.PENDING_PAYMENT, updatedBooking.getStatus());

    // 10. Farmer checks tracking status via WhatsApp (Option 4)
    WhatsAppInboundRequest req8 =
        WhatsAppInboundRequest.builder().from(FARMER_PHONE).message("4").build();
    WhatsAppMessageResponse resp8 = whatsAppBotService.processIncomingMessage(req8);
    assertNotNull(resp8);
    assertTrue(resp8.getMessage().contains("Live Tracking for Booking"));
    assertTrue(resp8.getMessage().contains(bookingNumber));
    assertTrue(resp8.getMessage().contains("Payment verification in progress"));

    // 11. Test Proactive Outbound Notification Service
    WhatsAppMessageResponse notif =
        whatsAppNotificationService.notifyBookingCreated(booking.getId());
    assertNotNull(notif);
    assertTrue(notif.getMessage().contains("EquipGrid Booking"));
    assertTrue(notif.getMessage().contains(bookingNumber));
  }

  @Test
  @DisplayName("UPI QR Code Generator Unit Verification")
  void testUpiQrGeneratorService() {
    String uri =
        upiQrGeneratorService.generateUpiPaymentUri(
            "equipgrid@upi",
            "EquipGrid Rentals",
            new BigDecimal("12500.00"),
            "Security Deposit BK-9999",
            "BK-9999");
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
  @DisplayName(
      "Construction Machine Flow: Directly prompts for Site location without Home/Farm question")
  void testConstructionSiteLocationFlow() {
    String contractorPhone = "9876599999";
    whatsAppBotService.resetConversation(contractorPhone);

    // Ensure construction asset exists
    com.equipgrid.master.entity.EquipmentType type2 =
        equipmentTypeRepository.save(
            com.equipgrid.master.entity.EquipmentType.builder()
                .name("Concrete Mixer")
                .code("MIX-10-7")
                .category(AssetCategory.CONSTRUCTION)
                .hindiName("कंक्रीट मिलाने की मशीन (Concrete Mixer)")
                .build());

    com.equipgrid.master.entity.Manufacturer mfg2 =
        manufacturerRepository.save(
            com.equipgrid.master.entity.Manufacturer.builder()
                .name("Tata")
                .code("MFG-TATA")
                .build());

    com.equipgrid.master.entity.MachineModel model2 =
        machineModelRepository.save(
            com.equipgrid.master.entity.MachineModel.builder()
                .name("Tata Concrete Mixer 10/7")
                .modelNumber("TATA-10-7")
                .type(type2)
                .manufacturer(mfg2)
                .build());

    Asset mixer =
        Asset.builder()
            .assetTag("C-MIX-099")
            .model(model2)
            .type(type2)
            .category(AssetCategory.CONSTRUCTION)
            .manufacturer(mfg2)
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
    WhatsAppInboundRequest req1 =
        WhatsAppInboundRequest.builder()
            .from(contractorPhone)
            .userName("Vikram Construction")
            .message("1")
            .build();
    WhatsAppMessageResponse resp1 = whatsAppBotService.processIncomingMessage(req1);
    assertEquals(WhatsAppState.SELECTING_CATEGORY, resp1.getState());
    assertTrue(resp1.getMessage().contains("Construction Equipment"));

    // 1b. Select Category 2 (Construction) -> Prompts for Hub
    WhatsAppInboundRequest req1b =
        WhatsAppInboundRequest.builder().from(contractorPhone).message("2").build();
    WhatsAppMessageResponse resp1b = whatsAppBotService.processIncomingMessage(req1b);
    assertEquals(WhatsAppState.SELECTING_HUB, resp1b.getState());
    assertTrue(resp1b.getMessage().contains("Station Hub"));

    // 1c. Select Hub 1 (Hardoi Central Yard) -> Prompts for Rental Dates
    WhatsAppInboundRequest req1c =
        WhatsAppInboundRequest.builder().from(contractorPhone).message("1").build();
    WhatsAppMessageResponse resp1c = whatsAppBotService.processIncomingMessage(req1c);
    assertEquals(WhatsAppState.ENTERING_DATES, resp1c.getState());
    assertTrue(resp1c.getMessage().contains("Rental Duration"));

    // 2. Enter Duration (5 days) -> Displays Construction Machinery free for that date window
    WhatsAppInboundRequest req2 =
        WhatsAppInboundRequest.builder().from(contractorPhone).message("5").build();
    WhatsAppMessageResponse resp2 = whatsAppBotService.processIncomingMessage(req2);
    assertEquals(WhatsAppState.SELECTING_ASSET, resp2.getState());
    assertTrue(resp2.getMessage().contains("Construction Equipment"));
    assertTrue(resp2.getMessage().contains("कंक्रीट मिलाने की मशीन (Concrete Mixer)"));

    // 3. Select Concrete Mixer -> Dates already known, directly prompts for Construction Site
    // location
    WhatsAppInboundRequest req3 =
        WhatsAppInboundRequest.builder().from(contractorPhone).message("C-MIX-099").build();
    WhatsAppMessageResponse resp3 = whatsAppBotService.processIncomingMessage(req3);
    assertEquals(WhatsAppState.ENTERING_LOCATION, resp3.getState());
    assertTrue(resp3.getMessage().contains("कंक्रीट मिलाने की मशीन (Concrete Mixer)"));
    assertTrue(resp3.getMessage().contains("Construction Site Delivery Location"));
    assertTrue(resp3.getMessage().contains("Option A:* Share WhatsApp Location Pin"));
    assertTrue(resp3.getMessage().contains("Option B:* Type Site Address"));

    // 4. Contractor types site address
    WhatsAppInboundRequest req4 =
        WhatsAppInboundRequest.builder()
            .from(contractorPhone)
            .message("Highway Project Site Km 42, Lucknow Bypass")
            .build();
    WhatsAppMessageResponse resp4 = whatsAppBotService.processIncomingMessage(req4);
    assertEquals(WhatsAppState.CONFIRMING_BOOKING, resp4.getState());
    assertTrue(resp4.getMessage().contains("Construction Site"));
    assertTrue(resp4.getMessage().contains("Highway Project Site Km 42"));
    assertTrue(resp4.getMessage().contains("कंक्रीट मिलाने की मशीन (Concrete Mixer)"));
  }

  @Test
  @DisplayName(
      "Verify Customer Existence Check: No duplicate customer rows created across +91 / 91 / 10-digit formats")
  void testCustomerExistenceCheckPreventsDuplicatesAcrossPhoneFormats() {
    String testPhone10 = "9822334455";
    String testPhoneWithCountry = "+91" + testPhone10;

    // Reset conversation
    whatsAppBotService.resetConversation(testPhone10);

    // Pre-create customer with international format (+919822334455) as if created via Web Portal or
    // Station Desk
    Customer preExisting =
        customerRepository.save(
            Customer.builder()
                .phone(testPhoneWithCountry)
                .fullName("Pre Registered Kisan")
                .address("Village Kakori, Hardoi Road")
                .tier(com.equipgrid.customer.enums.CustomerTier.TIER_2_VERIFIED)
                .verified(true)
                .build());

    assertNotNull(preExisting.getId());
    long customerCountBefore = customerRepository.count();

    // Send WhatsApp message with standard 10-digit format
    WhatsAppInboundRequest req1 =
        WhatsAppInboundRequest.builder()
            .from(testPhone10)
            .userName("Pre Registered Kisan")
            .message("NAMASTE")
            .build();
    WhatsAppMessageResponse resp1 = whatsAppBotService.processIncomingMessage(req1);
    assertNotNull(resp1);

    // Verify NO duplicate customer record was created
    assertEquals(
        customerCountBefore,
        customerRepository.count(),
        "Customer count must not increase for existing customer");

    // Verify lookup by 10-digit phone resolves to the pre-existing entity
    Optional<Customer> foundBy10 = customerQueryRepository.fetchByPhone(testPhone10);
    assertTrue(foundBy10.isPresent());
    assertEquals(preExisting.getId(), foundBy10.get().getId());

    // Send another message from whatsapp: prefixed sender
    WhatsAppInboundRequest req2 =
        WhatsAppInboundRequest.builder().from("whatsapp:+91" + testPhone10).message("MENU").build();
    WhatsAppMessageResponse resp2 = whatsAppBotService.processIncomingMessage(req2);
    assertNotNull(resp2);

    assertEquals(
        customerCountBefore,
        customerRepository.count(),
        "Customer count must still remain unchanged");
  }

  @Test
  @DisplayName(
      "Returning Customer Flow: Recognizes existing customer, displays saved farms, and books without location pin prompt")
  void testReturningCustomerFlowWithSavedFarmLocations() {
    String returningPhone = "9877112233";
    whatsAppBotService.resetConversation(returningPhone);

    // 1. Create returning customer with pre-saved farm locations
    Customer customer =
        customerRepository.save(
            Customer.builder()
                .phone(returningPhone)
                .fullName("Suresh Verma")
                .address("Village Sandila, Hardoi")
                .hub(hubRepository.findAll().get(0))
                .tier(com.equipgrid.customer.enums.CustomerTier.TIER_2_VERIFIED)
                .verified(true)
                .build());

    com.equipgrid.farmlocation.entity.FarmLocation farm1 =
        farmLocationRepository.save(
            com.equipgrid.farmlocation.entity.FarmLocation.builder()
                .customer(customer)
                .localName("Gram Rampur Farm")
                .localNameHindi("रामपुर खेत")
                .locationType(com.equipgrid.farmlocation.enums.FarmLocationType.FARM)
                .latitude(new BigDecimal("27.1234000"))
                .longitude(new BigDecimal("80.5678000"))
                .landmark("Near Sharda Canal Bridge")
                .isDefault(true)
                .active(true)
                .build());

    com.equipgrid.farmlocation.entity.FarmLocation farm2 =
        farmLocationRepository.save(
            com.equipgrid.farmlocation.entity.FarmLocation.builder()
                .customer(customer)
                .localName("Sandila Construction Yard")
                .localNameHindi("संडीला यार्ड")
                .locationType(com.equipgrid.farmlocation.enums.FarmLocationType.SITE)
                .landmark("Phase 2 Industrial Area")
                .isDefault(false)
                .active(true)
                .build());

    long farmLocationCountBefore = farmLocationRepository.count();

    // 2. Returning customer says NAMASTE
    WhatsAppInboundRequest req1 =
        WhatsAppInboundRequest.builder()
            .from(returningPhone)
            .userName("Suresh Verma")
            .message("NAMASTE")
            .build();
    WhatsAppMessageResponse resp1 = whatsAppBotService.processIncomingMessage(req1);
    assertNotNull(resp1);
    assertEquals(WhatsAppState.MAIN_MENU, resp1.getState());
    assertTrue(
        resp1.getMessage().contains("Welcome back"),
        "Returning customer must see personalized Welcome back greeting");
    assertTrue(resp1.getMessage().contains("Suresh Verma"));

    // 3. Select 1 (Browse Machinery & Rent)
    WhatsAppInboundRequest req2 =
        WhatsAppInboundRequest.builder().from(returningPhone).message("1").build();
    WhatsAppMessageResponse resp2 = whatsAppBotService.processIncomingMessage(req2);
    assertEquals(WhatsAppState.SELECTING_CATEGORY, resp2.getState());

    // 4. Select Category 1 (Agriculture) -> Because customer has registered hub, hub is
    // auto-associated and dates are prompted!
    WhatsAppInboundRequest req3 =
        WhatsAppInboundRequest.builder().from(returningPhone).message("1").build();
    WhatsAppMessageResponse resp3 = whatsAppBotService.processIncomingMessage(req3);
    assertEquals(
        WhatsAppState.ENTERING_DATES,
        resp3.getState(),
        "Should proceed straight to dates since hub is already registered");

    // 5. Enter 3 Days duration -> Displays machines
    WhatsAppInboundRequest req4 =
        WhatsAppInboundRequest.builder().from(returningPhone).message("3").build();
    WhatsAppMessageResponse resp4 = whatsAppBotService.processIncomingMessage(req4);
    assertEquals(WhatsAppState.SELECTING_ASSET, resp4.getState());
    assertTrue(resp4.getMessage().contains("TRAC-001"));

    // 6. Select Machine #1 (Tractor) -> Directly presents previously saved locations!
    WhatsAppInboundRequest req5 =
        WhatsAppInboundRequest.builder().from(returningPhone).message("1").build();
    WhatsAppMessageResponse resp5 = whatsAppBotService.processIncomingMessage(req5);
    assertEquals(WhatsAppState.SELECTING_DELIVERY_DESTINATION, resp5.getState());
    assertTrue(resp5.getMessage().contains("Previously Saved Locations"));
    assertTrue(resp5.getMessage().contains("Gram Rampur Farm"));
    assertTrue(resp5.getMessage().contains("Sandila Construction Yard"));
    assertTrue(resp5.getMessage().contains("Add New Location"));

    // 7. Select Option 1 (Gram Rampur Farm) -> Directly generates Quote without re-prompting for
    // GPS coordinates!
    WhatsAppInboundRequest req6 =
        WhatsAppInboundRequest.builder().from(returningPhone).message("1").build();
    WhatsAppMessageResponse resp6 = whatsAppBotService.processIncomingMessage(req6);
    assertEquals(WhatsAppState.CONFIRMING_BOOKING, resp6.getState());
    assertTrue(resp6.getMessage().contains("Quotation Summary"));
    assertTrue(resp6.getMessage().contains("Gram Rampur Farm"));
    assertTrue(resp6.getMessage().contains("CONFIRM"));

    // 8. Confirm Booking -> Verifies FarmLocation is linked and NO duplicate farm location record
    // was inserted
    WhatsAppInboundRequest req7 =
        WhatsAppInboundRequest.builder().from(returningPhone).message("CONFIRM").build();
    WhatsAppMessageResponse resp7 = whatsAppBotService.processIncomingMessage(req7);
    assertEquals(WhatsAppState.AWAITING_PAYMENT, resp7.getState());
    assertNotNull(resp7.getBookingNumber());

    // Verify farm locations count in DB did NOT increase
    assertEquals(
        farmLocationCountBefore,
        farmLocationRepository.count(),
        "No duplicate farm_location rows should be created");

    // Verify booking in DB is linked to the selected farmLocation
    Booking booking = bookingQueryRepository.fetchByCustomerId(customer.getId()).get(0);
    assertNotNull(booking.getFarmLocation());
    assertEquals(farm1.getId(), booking.getFarmLocation().getId());
  }

  @Test
  @DisplayName(
      "Auto Hub Mapping: Hub ID is automatically mapped to customer when booking is created or confirmed")
  void testAutoHubMappingOnBookingCreationAndConfirmation() {
    // 1. Create customer without hub
    Customer customerWithoutHub =
        customerRepository.save(
            Customer.builder()
                .phone("9833445566")
                .fullName("Pooja Sharma")
                .address("Village Kakori")
                .tier(com.equipgrid.customer.enums.CustomerTier.TIER_1_BASIC)
                .verified(false)
                .build());

    assertNull(customerWithoutHub.getHub(), "Customer initially has no mapped hub");

    // 2. Manager/Admin creates booking for this customer for a machine stationed at Hardoi Yard
    com.equipgrid.location.entity.Hub hardoiHub = hubRepository.findAll().get(0);
    Asset availableAsset =
        assetRepository.findAll().stream()
            .filter(a -> a.getHub() != null && a.getHub().getId().equals(hardoiHub.getId()))
            .findFirst()
            .orElseThrow();

    com.equipgrid.booking.dto.request.CreateBookingRequest createRequest =
        com.equipgrid.booking.dto.request.CreateBookingRequest.builder()
            .customerId(customerWithoutHub.getId())
            .assetId(availableAsset.getId())
            .startDate(java.time.LocalDate.now().plusDays(10))
            .endDate(java.time.LocalDate.now().plusDays(12))
            .deliveryAddress("Kakori Farm, Hardoi Road")
            .notes("Station Desk admin booking")
            .build();

    Booking created = bookingService.createBooking(createRequest, "MANAGER_DESK");
    assertNotNull(created);

    // Verify customer record in database now has hub_id automatically updated!
    Customer reloadedCustomer =
        customerRepository.findById(customerWithoutHub.getId()).orElseThrow();
    assertNotNull(
        reloadedCustomer.getHub(),
        "Customer hub must be automatically populated upon booking creation");
    assertEquals(
        hardoiHub.getId(),
        reloadedCustomer.getHub().getId(),
        "Customer hub must match the machine dispatch yard");

    // 3. Status confirmation test: If customer has different/null hub, confirming status updates it
    reloadedCustomer.setHub(null);
    customerRepository.save(reloadedCustomer);

    bookingService.updateStatus(
        created.getId(), BookingStatus.CONFIRMED, "Advance verified by manager", "MANAGER_ADMIN");
    Customer customerAfterConfirm =
        customerRepository.findById(customerWithoutHub.getId()).orElseThrow();
    assertNotNull(
        customerAfterConfirm.getHub(), "Customer hub must be populated on status confirmation");
    assertEquals(hardoiHub.getId(), customerAfterConfirm.getHub().getId());
  }

  @Test
  @DisplayName(
      "Personalized Greetings: Bot mirrors Ram Ram, Pranam, Namaste with respectful 'ji' matching user's greeting")
  void testPersonalizedGreetingReciprocation() {
    String phone1 = "919811122233";
    customerRepository.save(
        Customer.builder()
            .phone(phone1)
            .fullName("Jaisingh")
            .address("Village Pipra, Hardoi")
            .tier(com.equipgrid.customer.enums.CustomerTier.TIER_1_BASIC)
            .verified(false)
            .build());

    // 1. User greets with "Ram Ram" -> Bot replies with "राम राम जयसिंह जी! (Ram Ram Jaisingh ji!)"
    WhatsAppInboundRequest reqRamRam =
        WhatsAppInboundRequest.builder().from(phone1).message("Ram Ram").build();
    WhatsAppMessageResponse respRamRam = whatsAppBotService.processIncomingMessage(reqRamRam);
    assertNotNull(respRamRam);
    assertTrue(
        respRamRam.getMessage().contains("Ram Ram") || respRamRam.getMessage().contains("राम राम"),
        "Reply must reciprocate Ram Ram");
    assertTrue(
        respRamRam.getMessage().contains("Jaisingh ji"),
        "Reply must respectfully address customer as Jaisingh ji");

    // 2. User greets with "Pranam" -> Bot replies with "प्रणाम रामपाल जी! (Pranam Rampal ji!)"
    String phone2 = "919811122244";
    customerRepository.save(
        Customer.builder()
            .phone(phone2)
            .fullName("Rampal")
            .address("Village Sandila, Hardoi")
            .tier(com.equipgrid.customer.enums.CustomerTier.TIER_1_BASIC)
            .verified(false)
            .build());

    WhatsAppInboundRequest reqPranam =
        WhatsAppInboundRequest.builder().from(phone2).message("pranam").build();
    WhatsAppMessageResponse respPranam = whatsAppBotService.processIncomingMessage(reqPranam);
    assertNotNull(respPranam);
    assertTrue(
        respPranam.getMessage().contains("Pranam") || respPranam.getMessage().contains("प्रणाम"),
        "Reply must reciprocate Pranam");
    assertTrue(
        respPranam.getMessage().contains("Rampal ji"),
        "Reply must respectfully address customer as Rampal ji");

    // 3. User greets with "Hello" -> Bot replies with "Hello Rampal ji!"
    WhatsAppInboundRequest reqHello =
        WhatsAppInboundRequest.builder().from(phone2).message("Hello").build();
    WhatsAppMessageResponse respHello = whatsAppBotService.processIncomingMessage(reqHello);
    assertNotNull(respHello);
    assertTrue(
        respHello.getMessage().contains("Hello Rampal ji!"),
        "Reply must greet with Hello Rampal ji!");
  }

  @Test
  @DisplayName(
      "Category Selection & Intent: Displays 3 categories including Dual-Use Fleet and extracts customer intent")
  void testThreeCategoriesAndDualUseIntentExtraction() {
    String testPhone = "919811122255";
    customerRepository.save(
        Customer.builder()
            .phone(testPhone)
            .fullName("Dharmendra Singh")
            .address("Village Beniganj, Hardoi")
            .tier(com.equipgrid.customer.enums.CustomerTier.TIER_1_BASIC)
            .verified(false)
            .build());

    // 1. Send MENU -> Main Menu -> Select 1 (Browse Machinery & Rent)
    whatsAppBotService.processIncomingMessage(
        WhatsAppInboundRequest.builder().from(testPhone).message("MENU").build());

    WhatsAppMessageResponse catPrompt =
        whatsAppBotService.processIncomingMessage(
            WhatsAppInboundRequest.builder().from(testPhone).message("1").build());

    assertNotNull(catPrompt);
    assertEquals(WhatsAppState.SELECTING_CATEGORY, catPrompt.getState());
    assertTrue(catPrompt.getMessage().contains("Agriculture Machinery"), "Must show Agriculture");
    assertTrue(catPrompt.getMessage().contains("Construction Equipment"), "Must show Construction");
    assertTrue(
        catPrompt.getMessage().contains("Dual-Use & Multipurpose Fleet")
            || catPrompt.getMessage().contains("डुअल यूज़"),
        "Must show third category: Dual-Use & Multipurpose Fleet");
    assertTrue(
        catPrompt.getSuggestedOptions().stream().anyMatch(o -> o.contains("Dual-Use")),
        "Suggested options must include Dual-Use Fleet");

    // 2. Select Option 3 -> Selects MULTIPURPOSE_FLEET
    WhatsAppMessageResponse hubPrompt =
        whatsAppBotService.processIncomingMessage(
            WhatsAppInboundRequest.builder().from(testPhone).message("3").build());

    assertNotNull(hubPrompt);
    assertEquals(WhatsAppState.SELECTING_HUB, hubPrompt.getState());
    assertTrue(
        hubPrompt.getMessage().contains("Dual-Use & Multipurpose Fleet"),
        "Hub prompt header must reflect Dual-Use & Multipurpose Fleet");

    // 3. Intent extraction test in VoiceNoteProcessingService:
    // A) Dual use tractor/trolley intent
    com.equipgrid.whatsapp.dto.model.VoiceBookingIntent intentMulti =
        voiceNoteProcessingService.parseTranscriptIntent(
            "Mujhe 3 din ke liye trolley aur tractor chahiye");
    assertNotNull(intentMulti);
    assertEquals(
        "MULTIPURPOSE_FLEET",
        intentMulti.getAssetCategory(),
        "Tractor and trolley request must extract MULTIPURPOSE_FLEET category");

    // B) Construction mixer/JCB intent
    com.equipgrid.whatsapp.dto.model.VoiceBookingIntent intentConst =
        voiceNoteProcessingService.parseTranscriptIntent(
            "Concrete mixer chahiye 2 din ke liye site pe");
    assertNotNull(intentConst);
    assertEquals(
        "CONSTRUCTION",
        intentConst.getAssetCategory(),
        "Concrete mixer request must extract CONSTRUCTION category");

    // C) Agriculture reaper/rotavator intent
    com.equipgrid.whatsapp.dto.model.VoiceBookingIntent intentAgri =
        voiceNoteProcessingService.parseTranscriptIntent(
            "Khet ke liye reaper aur rotavator chahiye 2 din");
    assertNotNull(intentAgri);
    assertEquals(
        "AGRICULTURE",
        intentAgri.getAssetCategory(),
        "Reaper/rotavator farm request must extract AGRICULTURE category");
  }
}
