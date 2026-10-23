package com.equipgrid.intelligence.tool;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.asset.repository.AssetQueryRepository;
import com.equipgrid.booking.service.PricingEngine;
import com.equipgrid.intelligence.dto.model.EquipmentCardDto;
import com.equipgrid.intelligence.service.IAssetVectorEmbeddingService;
import com.equipgrid.location.entity.Hub;
import com.equipgrid.location.repository.HubRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

/**
 * MCP-style Function Calling & Tools Engine for EquipGrid Intelligence Assistant. Provides
 * deterministic, real-time database queries and pricing engine calculations to eliminate LLM
 * hallucinations on pricing, deposit policies, and fleet availability.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FleetIntelligenceTools {

  private final AssetQueryRepository assetQueryRepository;
  private final HubRepository hubRepository;
  private final PricingEngine pricingEngine;
  private final ObjectMapper objectMapper;
  private final IAssetVectorEmbeddingService assetVectorEmbeddingService;

  /** Builds the Google Gemini functionDeclarations tools schema array. */
  public ArrayNode buildGeminiToolDeclarations() {
    ArrayNode tools = objectMapper.createArrayNode();
    ObjectNode toolsWrapper = tools.addObject();
    ArrayNode functionDeclarations = toolsWrapper.putArray("functionDeclarations");

    // Tool 1: searchAvailableFleet
    ObjectNode searchTool = functionDeclarations.addObject();
    searchTool.put("name", "searchAvailableFleet");
    searchTool.put(
        "description",
        "Searches live EquipGrid inventory in Uttar Pradesh (Hardoi, Sandila, Bilgram) for machinery by keyword, agricultural task, category, or hub name. Supports English, Hindi transliteration, and colloquial terms (weeder, nirai, gudai, mixer, reaper, katai, auger, gaddha, pump, generator).");
    ObjectNode searchParams = searchTool.putObject("parameters");
    searchParams.put("type", "OBJECT");
    ObjectNode searchProps = searchParams.putObject("properties");
    searchProps
        .putObject("query")
        .put("type", "STRING")
        .put(
            "description",
            "Machine keyword, task, or colloquial Hindi term (e.g. weeder, cement mixer, reaper, gaddha khodna)");
    searchProps
        .putObject("category")
        .put("type", "STRING")
        .put("description", "Optional category filter: AGRICULTURE or CONSTRUCTION");
    searchProps
        .putObject("hubName")
        .put("type", "STRING")
        .put("description", "Optional yard location: Hardoi, Sandila, or Bilgram");

    // Tool 2: calculateRentalQuote
    ObjectNode quoteTool = functionDeclarations.addObject();
    quoteTool.put("name", "calculateRentalQuote");
    quoteTool.put(
        "description",
        "Calculates exact commercial rental quote, deposit, and delivery fee using the backend Pricing Engine. Returns base rent, refundable deposit, delivery fee, and 2-Hour refund timeline.");
    ObjectNode quoteParams = quoteTool.putObject("parameters");
    quoteParams.put("type", "OBJECT");
    ObjectNode quoteProps = quoteParams.putObject("properties");
    quoteProps
        .putObject("assetTag")
        .put("type", "STRING")
        .put("description", "Asset Tag or machine name (e.g. A-WED-002, 10/7 Concrete Mixer)");
    quoteProps
        .putObject("durationDays")
        .put("type", "INTEGER")
        .put("description", "Rental duration in days (default 1)");
    quoteProps
        .putObject("distanceKm")
        .put("type", "NUMBER")
        .put("description", "Delivery distance in km from hub (default 10.0)");
    quoteProps
        .putObject("operatorRequired")
        .put("type", "BOOLEAN")
        .put("description", "Whether a dedicated machine operator is required (default false)");

    // Tool 3: getHubCoverage
    ObjectNode hubTool = functionDeclarations.addObject();
    hubTool.put("name", "getHubCoverage");
    hubTool.put(
        "description",
        "Retrieves operating details, phone numbers, and delivery radius of EquipGrid regional yards across Uttar Pradesh.");
    ObjectNode hubParams = hubTool.putObject("parameters");
    hubParams.put("type", "OBJECT");
    ObjectNode hubProps = hubParams.putObject("properties");
    hubProps
        .putObject("hubName")
        .put("type", "STRING")
        .put("description", "Hub or town name (Hardoi, Sandila, Bilgram, or nearby villages)");

    // Tool 4: getServiceGuarantees
    ObjectNode policyTool = functionDeclarations.addObject();
    policyTool.put("name", "getServiceGuarantees");
    policyTool.put(
        "description",
        "Retrieves official policies: 2-Hour Security Deposit Refund Guarantee, 90-Minute Zero-Breakdown SLA, and doorstep farm delivery.");
    ObjectNode policyParams = policyTool.putObject("parameters");
    policyParams.put("type", "OBJECT");

    return tools;
  }

  /** Executes the requested tool and returns the JSON payload for Gemini functionResponse. */
  public JsonNode executeTool(
      String toolName, JsonNode args, List<EquipmentCardDto> outMatchedCards) {
    log.info("[MCP Tool] Executing tool '{}' with args: {}", toolName, args);
    ObjectNode response = objectMapper.createObjectNode();

    switch (toolName) {
      case "searchAvailableFleet":
        return executeSearchFleet(args, outMatchedCards);
      case "calculateRentalQuote":
        return executeCalculateQuote(args, outMatchedCards);
      case "getHubCoverage":
        return executeGetHubCoverage(args);
      case "getServiceGuarantees":
        return executeGetServiceGuarantees();
      default:
        response.put("error", "Unknown tool: " + toolName);
        return response;
    }
  }

  private List<Asset> fetchAssetsSafe() {
    try {
      List<Asset> assets = assetQueryRepository.fetchAssets(null, AssetStatus.AVAILABLE);
      if (assets != null && !assets.isEmpty()) {
        return assets;
      }
    } catch (Exception e) {
      log.warn("[FleetIntelligenceTools] Could not query assets via QueryDSL: {}", e.getMessage());
    }
    return List.of();
  }

  private JsonNode executeSearchFleet(JsonNode args, List<EquipmentCardDto> outMatchedCards) {
    String query = args != null && args.has("query") ? args.path("query").asText() : "";
    String category = args != null && args.has("category") ? args.path("category").asText() : null;
    String hubName = args != null && args.has("hubName") ? args.path("hubName").asText() : null;

    List<Asset> allAssets = fetchAssetsSafe();
    List<Asset> matched = new ArrayList<>();

    String lowerQuery = query.toLowerCase(Locale.ROOT);
    String lowerHub = hubName != null ? hubName.toLowerCase(Locale.ROOT) : "";

    AssetCategory catFilter = null;
    if (StringUtils.isNotBlank(category)) {
      try {
        catFilter = AssetCategory.valueOf(category.toUpperCase(Locale.ROOT));
      } catch (Exception ignored) {
      }
    }

    // 1. First priority: High-dimensional Vector Cosine Similarity Search (pgvector)
    if (StringUtils.isNotBlank(query) && assetVectorEmbeddingService != null) {
      try {
        List<Asset> vectorMatches =
            assetVectorEmbeddingService.searchAssetsByVector(query, catFilter, null, 4);
        if (vectorMatches != null && !vectorMatches.isEmpty()) {
          for (Asset a : vectorMatches) {
            if (StringUtils.isBlank(lowerHub)
                || (a.getHub() != null
                    && a.getHub().getName().toLowerCase(Locale.ROOT).contains(lowerHub))) {
              matched.add(a);
            }
          }
        }
      } catch (Exception e) {
        log.warn("[FleetIntelligenceTools] Vector similarity search fallback: {}", e.getMessage());
      }
    }

    // 2. Complement with rule-based keyword & semantic dictionary matching
    for (Asset a : allAssets) {
      if (matched.contains(a)) {
        continue;
      }
      // Category filter
      if (catFilter != null) {
        if (!a.getCategory().equals(catFilter)) {
          continue;
        }
      }
      // Hub filter
      if (StringUtils.isNotBlank(lowerHub)) {
        if (a.getHub() != null
            && !a.getHub().getName().toLowerCase(Locale.ROOT).contains(lowerHub)) {
          continue;
        }
      }

      // Keyword / Semantic match
      String name = a.getName().toLowerCase(Locale.ROOT);
      String tag = a.getAssetTag().toLowerCase(Locale.ROOT);

      boolean isMatch =
          lowerQuery.isBlank() || isSemanticMatch(lowerQuery, name, tag, a.getCategory());
      if (isMatch) {
        matched.add(a);
      }
    }

    ObjectNode resultNode = objectMapper.createObjectNode();
    ArrayNode items = resultNode.putArray("availableEquipment");

    for (Asset a : matched) {
      EquipmentCardDto card = mapToCardDto(a);
      if (!outMatchedCards.contains(card) && outMatchedCards.size() < 4) {
        outMatchedCards.add(card);
      }

      ObjectNode item = items.addObject();
      item.put("assetId", a.getId());
      item.put("assetTag", a.getAssetTag());
      item.put("name", a.getName());
      item.put("hindiName", card.getHindiName());
      item.put("category", a.getCategory().name());
      item.put("dailyRate", a.getDailyRate());
      item.put("depositAmount", a.getDepositAmount());
      item.put(
          "isZeroDeposit",
          a.getDepositAmount() != null && a.getDepositAmount().compareTo(BigDecimal.ZERO) == 0);
      item.put("status", a.getStatus().name());
      item.put("hubName", a.getHub() != null ? a.getHub().getName() : null);
      item.put("bookingUrl", "/booking?equipmentId=" + a.getId());
    }

    resultNode.put("count", matched.size());
    resultNode.put(
        "refundGuarantee",
        "100% security deposit auto-refunded to UPI within 2 hours of machine return.");
    resultNode.put("breakdownSla", "90-minute mobile mechanic arrival or machine swap.");
    return resultNode;
  }

  private JsonNode executeCalculateQuote(JsonNode args, List<EquipmentCardDto> outMatchedCards) {
    String assetTag = args != null && args.has("assetTag") ? args.path("assetTag").asText() : "";
    int durationDays =
        args != null && args.has("durationDays")
            ? Math.max(1, args.path("durationDays").asInt())
            : 1;
    double distanceKm =
        args != null && args.has("distanceKm")
            ? Math.max(0, args.path("distanceKm").asDouble())
            : 10.0;
    boolean operator =
        args != null && args.has("operatorRequired") && args.path("operatorRequired").asBoolean();

    List<Asset> all = fetchAssetsSafe();
    Asset matched = null;

    for (Asset a : all) {
      if (a.getAssetTag().equalsIgnoreCase(assetTag)
          || a.getName().toLowerCase(Locale.ROOT).contains(assetTag.toLowerCase(Locale.ROOT))) {
        matched = a;
        break;
      }
    }
    if (matched == null && !all.isEmpty()) {
      matched = all.get(0);
    }

    ObjectNode quoteNode = objectMapper.createObjectNode();
    if (matched == null) {
      quoteNode.put("error", "Machine not found for tag/query: " + assetTag);
      return quoteNode;
    }

    EquipmentCardDto card = mapToCardDto(matched);
    if (!outMatchedCards.contains(card)) {
      outMatchedCards.add(card);
    }

    LocalDate start = LocalDate.now();
    LocalDate end = start.plusDays(durationDays - 1);
    PricingEngine.CommercialQuote quote =
        pricingEngine.calculate(
            matched.getDailyRate() != null ? matched.getDailyRate() : BigDecimal.ZERO,
            matched.getDepositAmount() != null ? matched.getDepositAmount() : BigDecimal.ZERO,
            start,
            end,
            BigDecimal.valueOf(distanceKm),
            operator);

    quoteNode.put("machineName", matched.getName());
    quoteNode.put("assetTag", matched.getAssetTag());
    quoteNode.put("durationDays", quote.durationDays);
    quoteNode.put("baseRent", quote.baseRent);
    quoteNode.put("depositAmount", quote.depositAmount);
    quoteNode.put("isZeroDeposit", quote.depositAmount.compareTo(BigDecimal.ZERO) == 0);
    quoteNode.put("deliveryFee", quote.deliveryFee);
    quoteNode.put("operatorFee", quote.operatorFee);
    quoteNode.put("totalAmount", quote.totalAmount);
    quoteNode.put(
        "depositRefundGuarantee",
        "Full deposit of ₹"
            + quote.depositAmount
            + " refunded to customer UPI within 120 minutes of return.");
    quoteNode.put("bookingUrl", "/booking?equipmentId=" + matched.getId());

    return quoteNode;
  }

  private JsonNode executeGetHubCoverage(JsonNode args) {
    String filter =
        args != null && args.has("hubName")
            ? args.path("hubName").asText().toLowerCase(Locale.ROOT)
            : "";
    List<Hub> hubs = hubRepository.findAll();

    ObjectNode res = objectMapper.createObjectNode();
    ArrayNode hubList = res.putArray("hubs");

    for (Hub h : hubs) {
      if (filter.isBlank()
          || h.getName().toLowerCase(Locale.ROOT).contains(filter)
          || (h.getAddress() != null && h.getAddress().toLowerCase(Locale.ROOT).contains(filter))) {
        ObjectNode node = hubList.addObject();
        node.put("name", h.getName());
        node.put("address", h.getAddress());
        node.put("contactPhone", h.getContactPhone());
        node.put("operatingRadiusKm", h.getOperatingRadiusKm());
        node.put("deliverySla", "Doorstep tractor-trailer field delivery within operating radius");
      }
    }
    res.put("tollFreeHelpLine", "+91 94674 79922 (9467479922)");
    res.put("whatsAppSupport", "+91 94674 79922");
    return res;
  }

  private JsonNode executeGetServiceGuarantees() {
    ObjectNode res = objectMapper.createObjectNode();
    res.put(
        "depositRefund",
        "100% automated UPI deposit refund in 120 minutes (2 hours) post yard return inspection.");
    res.put(
        "breakdownSla",
        "90-Minute Zero-Breakdown SLA: certified mobile mechanic or fresh machine replacement arriving on-site within 90 mins.");
    res.put(
        "fieldDelivery",
        "Tractor-trailer equipment drop-off directly to farmer GPS headlands or contractor construction sites.");
    res.put(
        "zeroDepositScheme",
        "Select fleet assets eligible for Zero Security Deposit booking under Fleet Scheme.");
    return res;
  }

  private boolean isSemanticMatch(String query, String name, String tag, AssetCategory category) {
    if (name.contains(query) || tag.contains(query)) return true;

    // Agriculture semantic matching (Hindi + English)
    if ((query.contains("weeder")
            || query.contains("nirai")
            || query.contains("gudai")
            || query.contains("निराई")
            || query.contains("जुताई"))
        && (name.contains("weeder") || tag.contains("wed"))) return true;
    if ((query.contains("reaper")
            || query.contains("katai")
            || query.contains("harvest")
            || query.contains("dhan")
            || query.contains("gehu")
            || query.contains("कटाई")
            || query.contains("धान")
            || query.contains("गेहूँ"))
        && (name.contains("reaper") || tag.contains("rep"))) return true;
    if ((query.contains("auger")
            || query.contains("gaddha")
            || query.contains("hole")
            || query.contains("गड्ढा"))
        && (name.contains("auger") || tag.contains("aug"))) return true;

    // Construction semantic matching (Hindi + English)
    if ((query.contains("mixer")
            || query.contains("cement")
            || query.contains("concrete")
            || query.contains("dhalaai")
            || query.contains("कंक्रीट")
            || query.contains("ढलाई"))
        && (name.contains("mixer") || tag.contains("mix"))) return true;
    if ((query.contains("vibrator") || query.contains("needle") || query.contains("कंपन"))
        && (name.contains("vibrator") || tag.contains("vib"))) return true;
    if ((query.contains("compactor")
            || query.contains("roller")
            || query.contains("kutai")
            || query.contains("कुटाई")
            || query.contains("रोड़ी"))
        && (name.contains("compactor") || tag.contains("cmp"))) return true;
    if ((query.contains("hammer")
            || query.contains("jackhammer")
            || query.contains("breaker")
            || query.contains("तोड़ना"))
        && (name.contains("jackhammer") || tag.contains("jck"))) return true;
    if ((query.contains("pump")
            || query.contains("dewater")
            || query.contains("water")
            || query.contains("कीचड़")
            || query.contains("पानी"))
        && (name.contains("pump") || tag.contains("pmp"))) return true;
    if ((query.contains("generator")
            || query.contains("power")
            || query.contains("genset")
            || query.contains("बिजली"))
        && (name.contains("generator") || tag.contains("gen"))) return true;

    if (query.contains("agri") && category == AssetCategory.AGRICULTURE) return true;
    return query.contains("construct") && category == AssetCategory.CONSTRUCTION;
  }

  public EquipmentCardDto mapToCardDto(Asset asset) {
    String hindiName =
        asset.getType() != null && asset.getType().getHindiName() != null
            ? asset.getType().getHindiName()
            : null;
    return EquipmentCardDto.builder()
        .id(asset.getId())
        .assetTag(asset.getAssetTag())
        .name(asset.getName())
        .hindiName(hindiName)
        .category(asset.getCategory().name())
        .dailyRate(asset.getDailyRate())
        .depositAmount(asset.getDepositAmount())
        .status(asset.getStatus().name())
        .hubName(asset.getHub() != null ? asset.getHub().getName() : null)
        .cityName(
            asset.getHub() != null && asset.getHub().getCity() != null
                ? asset.getHub().getCity().getName()
                : null)
        .imageUrl(asset.getImageUrl())
        .bookingUrl("/booking?equipmentId=" + asset.getId())
        .keyFeatures(
            List.of("Zero-Downtime Guarantee", "2-Hour Deposit Refund", "Doorstep Farm Delivery"))
        .build();
  }
}
