package com.equipgrid.master;

import static org.junit.jupiter.api.Assertions.*;

import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.auth.entity.User;
import com.equipgrid.common.Exceptions;
import com.equipgrid.master.dto.request.EquipmentTypeRequest;
import com.equipgrid.master.dto.request.ManufacturerRequest;
import com.equipgrid.master.dto.request.ModelRequest;
import com.equipgrid.master.dto.response.FuzzyCheckResponse;
import com.equipgrid.master.entity.EquipmentType;
import com.equipgrid.master.entity.MachineModel;
import com.equipgrid.master.entity.Manufacturer;
import com.equipgrid.master.service.IMachineMasterService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class MachineMasterIntegrationTest {

  @Autowired private IMachineMasterService machineMasterService;

  private final User adminCaller =
      User.builder()
          .id(101L)
          .username("station.admin")
          .role(com.equipgrid.auth.enums.Role.ADMIN)
          .build();

  private final User rootCaller =
      User.builder()
          .id(1L)
          .username("root.superadmin")
          .role(com.equipgrid.auth.enums.Role.ROOT)
          .build();

  // ==================== MANUFACTURERS (OEM) ====================

  @Test
  @DisplayName("Create Manufacturer with name, code, country and default active true")
  void testCreateManufacturer() {
    ManufacturerRequest req =
        ManufacturerRequest.builder()
            .name("Sonalika Tractors Test")
            .code("SONALIKA-TEST")
            .country("India")
            .build();

    Manufacturer mfg = machineMasterService.createManufacturer(req);
    assertNotNull(mfg.getId());
    assertEquals("Sonalika Tractors Test", mfg.getName());
    assertEquals("SONALIKA-TEST", mfg.getCode());
    assertEquals("India", mfg.getCountry());
    assertTrue(mfg.getActive(), "Manufacturer must be active by default");
  }

  @Test
  @DisplayName("Fuzzy duplicate detection rejects similar manufacturer name")
  void testFuzzyDuplicateManufacturer() {
    ManufacturerRequest req1 =
        ManufacturerRequest.builder()
            .name("Kubota Corporation India")
            .code("KUBOTA-TEST-1")
            .country("Japan")
            .build();
    machineMasterService.createManufacturer(req1);

    // Attempting to add a fuzzy duplicate: "Kubota Corp India"
    FuzzyCheckResponse check =
        machineMasterService.checkManufacturerAvailability("Kubota Corp India", null);
    assertTrue(check.isDuplicate(), "Should detect high similarity fuzzy duplicate");

    ManufacturerRequest dup =
        ManufacturerRequest.builder()
            .name("Kubota Corp India")
            .code("KUBOTA-TEST-2")
            .country("Japan")
            .build();

    assertThrows(
        Exceptions.DuplicateResourceException.class,
        () -> {
          machineMasterService.createManufacturer(dup);
        },
        "Should throw DuplicateResourceException on fuzzy duplicate");
  }

  @Test
  @DisplayName("Admins can add and update, but CANNOT delete manufacturer")
  void testAdminCannotDeleteManufacturer() {
    ManufacturerRequest req =
        ManufacturerRequest.builder()
            .name("Escorts Agri Test")
            .code("ESCORTS-TEST")
            .country("India")
            .build();
    Manufacturer mfg = machineMasterService.createManufacturer(req);

    // Admin attempt to delete must fail with ForbiddenException
    assertThrows(
        Exceptions.ForbiddenException.class,
        () -> {
          machineMasterService.deleteManufacturer(mfg.getId(), adminCaller);
        },
        "Admin caller must be forbidden from deleting manufacturer master");

    // Root caller can delete unlinked manufacturer
    assertDoesNotThrow(
        () -> {
          machineMasterService.deleteManufacturer(mfg.getId(), rootCaller);
        });
  }

  // ==================== EQUIPMENT TYPES ====================

  @Test
  @DisplayName(
      "Create Equipment Type with category required, Hindi & local language names and description")
  void testCreateEquipmentTypeWithMultilingual() {
    EquipmentTypeRequest req =
        EquipmentTypeRequest.builder()
            .name("Multicrop Harvester Test")
            .category(AssetCategory.AGRICULTURE)
            .hindiName("मल्टीक्रॉप हार्वेस्टर")
            .localLanguageName("कंबाइन हार्वेस्टर")
            .description("High capacity self-propelled agricultural grain harvester")
            .build();

    EquipmentType type = machineMasterService.createEquipmentType(req);
    assertNotNull(type.getId());
    assertEquals("Multicrop Harvester Test", type.getName());
    assertEquals(AssetCategory.AGRICULTURE, type.getCategory());
    assertEquals("मल्टीक्रॉप हार्वेस्टर", type.getHindiName());
    assertEquals("कंबाइन हार्वेस्टर", type.getLocalLanguageName());
    assertTrue(type.getActive(), "Equipment type must be active by default");
  }

  @Test
  @DisplayName("Fuzzy duplicate detection rejects similar equipment type name")
  void testFuzzyDuplicateEquipmentType() {
    EquipmentTypeRequest req1 =
        EquipmentTypeRequest.builder()
            .name("Laser Land Leveler Test")
            .category(AssetCategory.AGRICULTURE)
            .build();
    machineMasterService.createEquipmentType(req1);

    // "Laser Land Leveller Test" (alternate spelling)
    FuzzyCheckResponse check =
        machineMasterService.checkEquipmentTypeAvailability("Laser Land Leveller Test", null);
    assertTrue(check.isDuplicate(), "Should detect high similarity spelling variation");

    EquipmentTypeRequest dup =
        EquipmentTypeRequest.builder()
            .name("Laser Land Leveller Test")
            .category(AssetCategory.AGRICULTURE)
            .build();

    assertThrows(
        Exceptions.DuplicateResourceException.class,
        () -> {
          machineMasterService.createEquipmentType(dup);
        });
  }

  @Test
  @DisplayName("Admins can add and update, but CANNOT delete equipment type")
  void testAdminCannotDeleteEquipmentType() {
    EquipmentTypeRequest req =
        EquipmentTypeRequest.builder()
            .name("Solar Irrigation Pump Test")
            .category(AssetCategory.MULTIPURPOSE_FLEET)
            .build();
    EquipmentType type = machineMasterService.createEquipmentType(req);

    // Admin attempt to delete must fail
    assertThrows(
        Exceptions.ForbiddenException.class,
        () -> {
          machineMasterService.deleteEquipmentType(type.getId(), adminCaller);
        });

    // Root caller can delete unlinked type
    assertDoesNotThrow(
        () -> {
          machineMasterService.deleteEquipmentType(type.getId(), rootCaller);
        });
  }

  // ==================== ASSET MODELS ====================

  @Test
  @DisplayName("Create Machine Model requires equipment type and manufacturer")
  void testCreateMachineModelRequiresTypeAndManufacturer() {
    EquipmentType type =
        machineMasterService.createEquipmentType(
            EquipmentTypeRequest.builder()
                .name("Mini Excavator Test")
                .category(AssetCategory.CONSTRUCTION)
                .build());

    Manufacturer mfg =
        machineMasterService.createManufacturer(
            ManufacturerRequest.builder()
                .name("Tata Hitachi Test")
                .code("TATA-HITACHI-TEST")
                .country("India")
                .build());

    ModelRequest req =
        ModelRequest.builder()
            .typeId(type.getId())
            .manufacturerId(mfg.getId())
            .name("ZAXIS 33U-5A")
            .modelNumber("ZX33U-5A")
            .specs("Operating weight: 3510 kg, Engine power: 28.4 HP")
            .build();

    MachineModel model = machineMasterService.createMachineModel(req);
    assertNotNull(model.getId());
    assertEquals("ZAXIS 33U-5A", model.getName());
    assertEquals(type.getId(), model.getType().getId());
    assertEquals(mfg.getId(), model.getManufacturer().getId());
    assertTrue(model.getActive(), "Model must be active by default");
  }

  @Test
  @DisplayName("Admins cannot delete machine model, Root can delete")
  void testAdminCannotDeleteMachineModel() {
    EquipmentType type =
        machineMasterService.createEquipmentType(
            EquipmentTypeRequest.builder()
                .name("Rotavator Heavy Test")
                .category(AssetCategory.AGRICULTURE)
                .build());

    Manufacturer mfg =
        machineMasterService.createManufacturer(
            ManufacturerRequest.builder()
                .name("Shaktiman Implements Test")
                .code("SHAKTIMAN-TEST")
                .country("India")
                .build());

    MachineModel model =
        machineMasterService.createMachineModel(
            ModelRequest.builder()
                .typeId(type.getId())
                .manufacturerId(mfg.getId())
                .name("Semi Champion Plus 7ft")
                .build());

    assertThrows(
        Exceptions.ForbiddenException.class,
        () -> {
          machineMasterService.deleteMachineModel(model.getId(), adminCaller);
        });

    assertDoesNotThrow(
        () -> {
          machineMasterService.deleteMachineModel(model.getId(), rootCaller);
        });
  }
}
