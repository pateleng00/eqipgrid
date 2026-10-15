package com.equipgrid.intelligence.service;

import com.equipgrid.asset.entity.Asset;
import com.equipgrid.asset.enums.AssetCategory;
import com.equipgrid.asset.enums.AssetStatus;
import com.equipgrid.asset.repository.AssetQueryRepository;
import com.equipgrid.intelligence.dto.model.EquipmentCardDto;
import com.equipgrid.intelligence.dto.model.IntelligenceChatMessage;
import com.equipgrid.intelligence.dto.request.IntelligenceChatRequest;
import com.equipgrid.intelligence.dto.response.IntelligenceChatResponse;
import com.equipgrid.intelligence.tool.FleetIntelligenceTools;
import com.equipgrid.location.entity.Hub;
import com.equipgrid.location.repository.HubRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class IntelligenceChatServiceImpl implements IIntelligenceChatService {
  @Value("${equipgrid.intelligence.gemini.api-key}")
  private String configuredGeminiApiKey;

  @Value("${equipgrid.intelligence.gemini.model}")
  private String geminiModel;

  private static final HttpClient HTTP_CLIENT =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20)).build();
  private final AssetQueryRepository assetQueryRepository;
  private final HubRepository hubRepository;
  private final ObjectMapper objectMapper;
  private final FleetIntelligenceTools fleetIntelligenceTools;

  @Override
  public IntelligenceChatResponse chat(IntelligenceChatRequest request) {
    String userMessage = request.getMessage().trim();
    List<Asset> allAssets = fetchAllAvailableAssets();
    List<Hub> allHubs = hubRepository.findAll();
    List<EquipmentCardDto> matchedCards = new ArrayList<>();

    // 1. Try calling Gemini AI with Live MCP-style Tools & Function Calling
    String apiKey = resolveGeminiApiKey();
    if (StringUtils.isNotBlank(apiKey)) {
      try {
        String geminiReply =
            callGeminiApi(
                apiKey,
                userMessage,
                request.getConversationHistory(),
                allAssets,
                allHubs,
                matchedCards);
        if (StringUtils.isNotBlank(geminiReply)) {
          // If function calls didn't match equipment cards, use keyword heuristic
          if (matchedCards.isEmpty()) {
            matchedCards.addAll(matchEquipmentToQuery(userMessage, allAssets));
          }

          return IntelligenceChatResponse.builder()
              .reply(geminiReply)
              .modelUsed("EquipBot AI (Gemini + Live Fleet Tools)")
              .matchedEquipment(matchedCards)
              .suggestedQuestions(buildDynamicSuggestions(userMessage, matchedCards))
              .primaryActionUrl(determinePrimaryAction(matchedCards))
              .primaryActionLabel(
                  matchedCards.isEmpty()
                      ? "Explore All Machinery"
                      : "Book " + matchedCards.get(0).getName())
              .timestamp(System.currentTimeMillis())
              .build();
        }
      } catch (Exception e) {
        log.warn(
            "[Gemini AI] Call threw exception, falling back to local domain intelligence: {}",
            e.getMessage(),
            e);
      }
    } else {
      log.info("[Gemini AI] No valid API key configured; using EquipGrid Domain Knowledge Engine");
    }

    // 2. Fallback: Local domain-driven AI knowledge engine
    matchedCards.addAll(matchEquipmentToQuery(userMessage, allAssets));
    String localReply = generateLocalDomainReply(userMessage, allAssets, allHubs, matchedCards);
    return IntelligenceChatResponse.builder()
        .reply(localReply)
        .modelUsed("EquipBot Assistant (Local Knowledge)")
        .matchedEquipment(matchedCards)
        .suggestedQuestions(buildDynamicSuggestions(userMessage, matchedCards))
        .primaryActionUrl(determinePrimaryAction(matchedCards))
        .primaryActionLabel(matchedCards.isEmpty() ? "Browse Equipment Fleet" : "Book Machine Now")
        .timestamp(System.currentTimeMillis())
        .build();
  }

  private String resolveGeminiApiKey() {
    String envKey = System.getenv("GEMINI_API_KEY");
    if (StringUtils.isNotBlank(envKey)) {
      return envKey.trim();
    }
    if (StringUtils.isNotBlank(configuredGeminiApiKey)
        && !"AIzaSyALaFipN7rgB6apqXKznEYrUFBDhdFkG4Q".equals(configuredGeminiApiKey.trim())) {
      return configuredGeminiApiKey.trim();
    }
    String dotenvKey = findKeyInDotenv("GEMINI_API_KEY");
    if (StringUtils.isNotBlank(dotenvKey)) {
      return dotenvKey.trim();
    }
    return null;
  }

  private String findKeyInDotenv(String key) {
    try {
      Path[] candidatePaths =
          new Path[] {Paths.get(".env"), Paths.get("../.env"), Paths.get("../../.env")};
      for (Path path : candidatePaths) {
        if (Files.exists(path)) {
          List<String> lines = Files.readAllLines(path);
          for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.startsWith(key + "=")) {
              String val = trimmed.substring((key + "=").length()).trim();
              if ((val.startsWith("\"") && val.endsWith("\""))
                  || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.substring(1, val.length() - 1);
              }
              if (StringUtils.isNotBlank(val)) {
                return val;
              }
            }
          }
        }
      }
    } catch (Exception ignored) {
    }
    return null;
  }

  private String callGeminiApi(
      String apiKey,
      String userMessage,
      List<IntelligenceChatMessage> history,
      List<Asset> assets,
      List<Hub> hubs,
      List<EquipmentCardDto> matchedCards)
      throws Exception {
    List<String> modelsToTry = new ArrayList<>();
    if (StringUtils.isNotBlank(geminiModel)) {
      modelsToTry.add(geminiModel.trim());
    }
    if (!modelsToTry.contains("gemini-2.5-flash-lite")) {
      modelsToTry.add("gemini-2.5-flash-lite");
    }
    if (!modelsToTry.contains("gemini-flash-lite-latest")) {
      modelsToTry.add("gemini-flash-lite-latest");
    }
    if (!modelsToTry.contains("gemini-2.5-flash")) {
      modelsToTry.add("gemini-2.5-flash");
    }
    if (!modelsToTry.contains("gemini-flash-latest")) {
      modelsToTry.add("gemini-flash-latest");
    }
    if (!modelsToTry.contains("gemini-2.5-pro")) {
      modelsToTry.add("gemini-2.5-pro");
    }

    String systemInstruction = buildSystemPrompt(assets, hubs);

    for (String modelName : modelsToTry) {
      try {
        String endpoint =
            "https://generativelanguage.googleapis.com/v1beta/models/"
                + modelName
                + ":generateContent?key="
                + apiKey;

        ObjectNode root = objectMapper.createObjectNode();

        // System Instruction
        ObjectNode systemInstructionNode = root.putObject("systemInstruction");
        ArrayNode systemParts = systemInstructionNode.putArray("parts");
        systemParts.addObject().put("text", systemInstruction);

        // Real-time Fleet Intelligence Tools (MCP Tools)
        root.set("tools", fleetIntelligenceTools.buildGeminiToolDeclarations());

        // Contents
        ArrayNode contents = root.putArray("contents");

        // Add history
        if (history != null && !history.isEmpty()) {
          for (IntelligenceChatMessage msg : history) {
            if (StringUtils.isNotBlank(msg.getContent())) {
              ObjectNode contentNode = contents.addObject();
              contentNode.put(
                  "role",
                  "assistant".equalsIgnoreCase(msg.getRole())
                          || "model".equalsIgnoreCase(msg.getRole())
                      ? "model"
                      : "user");
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
        genConfig.put("temperature", 0.3);
        genConfig.put("maxOutputTokens", 900);

        // Up to 3 tool turns
        int turn = 0;
        while (turn < 3) {
          turn++;
          String jsonPayload = objectMapper.writeValueAsString(root);

          HttpRequest httpRequest =
              HttpRequest.newBuilder()
                  .uri(URI.create(endpoint))
                  .header("Content-Type", "application/json")
                  .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                  .timeout(Duration.ofSeconds(25))
                  .build();

          HttpResponse<String> httpResponse =
              HTTP_CLIENT.send(httpRequest, HttpResponse.BodyHandlers.ofString());

          if (httpResponse.statusCode() >= 200 && httpResponse.statusCode() < 300) {
            JsonNode responseJson = objectMapper.readTree(httpResponse.body());
            JsonNode candidate = responseJson.path("candidates").path(0);
            JsonNode candidateContent = candidate.path("content");
            JsonNode partsArray = candidateContent.path("parts");

            if (partsArray.isArray() && !partsArray.isEmpty()) {
              // Check for functionCall
              JsonNode functionCallPart = null;
              for (JsonNode part : partsArray) {
                if (part.has("functionCall")) {
                  functionCallPart = part;
                  break;
                }
              }

              if (functionCallPart != null) {
                JsonNode fnCall = functionCallPart.path("functionCall");
                String toolName = fnCall.path("name").asText();
                JsonNode args = fnCall.path("args");

                log.info("[Gemini Tool Call] Executing tool '{}' with args: {}", toolName, args);
                JsonNode toolResult =
                    fleetIntelligenceTools.executeTool(toolName, args, matchedCards);

                // Append model turn
                contents.add(candidateContent);

                // Append function response turn (Google Gemini API requires role: "user" for
                // function responses)
                ObjectNode fnTurn = contents.addObject();
                fnTurn.put("role", "user");
                ArrayNode fnParts = fnTurn.putArray("parts");
                ObjectNode fnPart = fnParts.addObject();
                ObjectNode fnRespWrapper = fnPart.putObject("functionResponse");
                fnRespWrapper.put("name", toolName);
                fnRespWrapper.set("response", toolResult);

                continue;
              }

              // Extract text response
              StringBuilder textBuilder = new StringBuilder();
              for (JsonNode part : partsArray) {
                if (part.has("text")) {
                  textBuilder.append(part.path("text").asText());
                }
              }

              String finalText = textBuilder.toString().trim();
              if (StringUtils.isNotBlank(finalText)) {
                log.info("[Gemini AI] Successfully generated response with model: {}", modelName);
                return finalText;
              }
            }
            break;
          } else if (httpResponse.statusCode() == 404) {
            log.warn("[Gemini AI] Model '{}' not found (404), trying next model...", modelName);
            break;
          } else if (httpResponse.statusCode() == 429) {
            log.warn(
                "[Gemini AI] Quota/Rate limit (429) on model '{}', failing over to next model...",
                modelName);
            break;
          } else if (httpResponse.statusCode() == 503) {
            log.warn(
                "[Gemini AI] Service unavailable (503) on model '{}', backing off and retrying...",
                modelName);
            try {
              Thread.sleep(1200);
            } catch (InterruptedException ignored) {
              Thread.currentThread().interrupt();
            }
            continue;
          } else {
            log.error(
                "[Gemini AI] Google API error (status {}): {}",
                httpResponse.statusCode(),
                httpResponse.body());
            break;
          }
        }
      } catch (Exception e) {
        log.warn("[Gemini AI] Failed execution with model '{}': {}", modelName, e.getMessage());
      }
    }

    return null;
  }

  private String buildSystemPrompt(List<Asset> assets, List<Hub> hubs) {
    StringBuilder sb = new StringBuilder();
    sb.append(
        "You are the official EquipGrid AI Assistant for EquipGrid (equipgrid.com), India's premier rural and urban heavy machinery rental network operating across Uttar Pradesh (Hardoi, Sandila, Bilgram, and surrounding districts).\n\n");
    sb.append("### Core Brand Guarantees & Features:\n");
    sb.append(
        "1. **2-Hour Security Deposit Refund Guarantee**: Refundable deposits paid via UPI are automatically returned within 120 minutes of machine return inspection with zero deductions.\n");
    sb.append(
        "2. **90-Minute Zero Breakdown SLA**: If a machine faces mechanical failure, our certified mobile technician or replacement machine arrives within 90 minutes.\n");
    sb.append(
        "3. **Farm Field Delivery via GPS**: Farmers and contractors can order from home; tractor-trailers drop machines directly at field headlands or construction sites.\n");
    sb.append(
        "4. **Instant UPI QR Booking**: Instant UPI reservation locking the machine in yard.\n");
    sb.append("5. **Operational Hubs**:\n");
    for (Hub h : hubs) {
      sb.append("   - ")
          .append(h.getName())
          .append(" (")
          .append(h.getAddress())
          .append(") - Phone: ")
          .append(h.getContactPhone())
          .append(", Radius: ")
          .append(h.getOperatingRadiusKm())
          .append("km\n");
    }
    sb.append("6. **24x7 Helpline**: Helpline +91 94674 79922 and WhatsApp: +91 94674 79922.\n\n");
    sb.append("### Live Tool Calling Rules:\n");
    sb.append(
        "- You have access to real-time tools connected directly to the EquipGrid inventory database and pricing engine.\n");
    sb.append(
        "- ALWAYS invoke `searchAvailableFleet` whenever the user asks about machinery availability, machine types, or rates (e.g. weeders, reapers, augers, concrete mixers, pumps, compactors).\n");
    sb.append(
        "- ALWAYS invoke `calculateRentalQuote` whenever the user asks for multi-day rental costs, delivery fees, or deposit amounts.\n");
    sb.append(
        "- Invoke `getHubCoverage` for yard locations, phone numbers, or operational radius.\n");
    sb.append(
        "- Invoke `getServiceGuarantees` for official details on deposit refund and breakdown SLA.\n\n");
    sb.append("### Response Style:\n");
    sb.append("- Provide clear, courteous, and accurate answers in clean Markdown.\n");
    sb.append("- Support English, Hindi, and Hinglish according to user preference.\n");
    sb.append(
        "- Always highlight our 2-Hour Security Deposit Refund Guarantee and 90-Minute Breakdown SLA when discussing bookings.\n");
    sb.append(
        "- Guide user on how to book directly online on the website or via our automated WhatsApp bot.\n");
    return sb.toString();
  }

  private String generateLocalDomainReply(
      String query, List<Asset> assets, List<Hub> hubs, List<EquipmentCardDto> matched) {
    String lower = query.toLowerCase();

    if (lower.contains("refund") || lower.contains("deposit") || lower.contains("security")) {
      return "### 💰 2-Hour Security Deposit Refund Guarantee\n\n"
          + "At EquipGrid, your security deposit is **100% safe and hassle-free**:\n\n"
          + "- **Instant UPI Return**: As soon as your rental period ends, our yard technician completes a rapid 2-minute visual check.\n"
          + "- **120-Minute Direct Credit**: The full deposit amount is credited back directly to your original UPI ID or bank account within **2 hours (120 minutes)**.\n"
          + "- **Zero Hidden Deductions**: Transparent billing with no paperwork hassles.\n\n"
          + "Need assistance with an existing deposit? Our billing desk is on standby at **+91 94674 79922**.";
    }

    if (lower.contains("breakdown")
        || lower.contains("repair")
        || lower.contains("stopped")
        || lower.contains("sla")
        || lower.contains("service")) {
      return "### 🚨 90-Minute Zero-Breakdown Guarantee\n\n"
          + "We understand that field downtime means lost harvest windows or construction delays:\n\n"
          + "- **Rapid Mobile Response**: In the rare event of mechanical failure, call **+91 94674 79922**.\n"
          + "- **90-Min Resolution SLA**: A certified field technician or a fresh replacement machine will arrive on site within **90 minutes** from our nearest operational hub.\n"
          + "- **Downtime Credit**: Lost operational hours are automatically credited back to your rental invoice.";
    }

    if (lower.contains("hub")
        || lower.contains("location")
        || lower.contains("hardoi")
        || lower.contains("sandila")
        || lower.contains("bilgram")
        || lower.contains("yard")) {
      return "### 📍 EquipGrid Operational Hubs & Delivery Network\n\n"
          + "We operate 3 regional equipment hubs across Uttar Pradesh with direct field delivery:\n\n"
          + "1. **Hardoi Central Yard**: Bilgram Road Industrial Area (Serving 30km radius - Shahabad, Tadiyawan) • Phone: `+91 94674 79922`\n"
          + "2. **Sandila Industrial Hub**: UPSIDC Phase 2, Lucknow-Hardoi Highway (Serving 25km radius - Beniganj, UPSIDC) • Phone: `+91 94674 79922`\n"
          + "3. **Bilgram Agro Yard**: Near Mandi Parishad (Serving 20km radius - Mallawan, Madhoganj) • Phone: `+91 94674 79922`\n\n"
          + "🚚 **Doorstep & Field Delivery**: We drop machinery right at your farm GPS headland or construction plot via our tractor-trailer fleet.";
    }

    if (lower.contains("book")
        || lower.contains("rent")
        || lower.contains("price")
        || lower.contains("cost")
        || !matched.isEmpty()) {
      StringBuilder sb = new StringBuilder();
      sb.append("### 🚜 Available Machinery & Rental Details\n\n");
      if (!matched.isEmpty()) {
        sb.append("Here is the equipment matching your request from our verified fleet:\n\n");
        for (EquipmentCardDto c : matched) {
          sb.append("- **")
              .append(c.getName())
              .append("** (")
              .append(c.getHindiName())
              .append(")\n");
          sb.append("  - **Daily Rent**: ₹").append(c.getDailyRate()).append(" / day\n");
          sb.append("  - **Security Deposit**: ₹")
              .append(c.getDepositAmount())
              .append(" *(Refunded in 2 hours)*\n");
          sb.append("  - **Hub**: ")
              .append(c.getHubName())
              .append(" • Status: **")
              .append(c.getStatus())
              .append("**\n");
        }
        sb.append(
            "\n👉 You can click **Book Machine Now** below to reserve instantly with dynamic UPI QR code!");
      } else {
        sb.append("We offer a complete fleet of agricultural and construction machinery:\n\n");
        sb.append(
            "- **Agricultural Fleet**: Heavy-duty 7HP Rotary Power Weeders, Walk-Behind Crop Reapers (Paddy/Wheat), Post-Hole Earth Augers.\n");
        sb.append(
            "- **Construction Fleet**: 10/7 Tilting Concrete Mixers (Diesel), Plate Compactors, Concrete Vibrators, Demolition Jackhammers, Dewatering Pumps, Diesel Generators.\n\n");
        sb.append(
            "All rentals include **doorstep farm/site delivery** and a **2-Hour Deposit Refund Guarantee**.");
      }
      return sb.toString();
    }

    if (lower.contains("delivery")
        || lower.contains("transport")
        || lower.contains("doorstep")
        || lower.contains("gps")
        || lower.contains("field")) {
      return "### 🚚 Farm Field GPS & Site Delivery\n\n"
          + "EquipGrid delivers machinery directly to your farm gate, field headland, or construction site:\n\n"
          + "- **GPS Pinpoint Delivery**: Share your location via WhatsApp or web booking, and our transport trailer brings the equipment directly.\n"
          + "- **Operating Radius**: 20–30 km coverage around Hardoi Central Yard, Sandila Industrial Hub, and Bilgram Agro Yard.\n"
          + "- **Transparent Logistics**: Base delivery is calculated at ₹15/km with zero surprise charges.\n\n"
          + "Ready to book delivery? Tell us your nearest village or town in Uttar Pradesh!";
    }

    if (lower.contains("contact")
        || lower.contains("phone")
        || lower.contains("call")
        || lower.contains("help")
        || lower.contains("support")
        || lower.contains("whatsapp")) {
      return "### 📞 Contact EquipGrid 24/7 Operations Desk\n\n"
          + "We are here round the clock to support farmers and construction teams:\n\n"
          + "- **24/7 Helpline**: 📞 `+91 94674 79922`\n"
          + "- **Instant WhatsApp Bot**: 💬 `+91 94674 79922`\n"
          + "- **Billing & Refund Desk**: Bilgram Road Industrial Area, Hardoi\n\n"
          + "You can also search or book machinery directly through this chat window!";
    }

    if (lower.contains("hello")
        || lower.contains("hi")
        || lower.contains("namaste")
        || lower.contains("hey")
        || lower.contains("pranam")) {
      return "### Namaste! Welcome to EquipGrid 🙏\n\n"
          + "I am your EquipBot Assistant. Here is what I can do for you:\n\n"
          + "1. **🚜 Browse & Book Machinery**: Power weeders, reapers, earth augers, concrete mixers, plate compactors.\n"
          + "2. **💰 Check Rental Rates**: Daily/weekly rent, refundable deposits, and our **2-Hour UPI Refund Guarantee**.\n"
          + "3. **🚚 Field Delivery**: Instant machine drop-off to your farm GPS location.\n"
          + "4. **🚨 90-Min Zero-Breakdown SLA**: On-site technician support or immediate replacement.\n\n"
          + "Which equipment or project do you need assistance with today?";
    }

    return "### EquipGrid AI Assistant 🙏\n\n"
        + "I can help you check machinery availability, calculate rental costs, verify delivery to your field GPS, and reserve equipment.\n\n"
        + "- **🌾 Agriculture**: Power Weeders, Crop Reapers, Earth Augers\n"
        + "- **🏗️ Construction**: Concrete Mixers, Vibrators, Plate Compactors, Demolition Jackhammers\n"
        + "- **⚡ Guarantees**: 2-Hour Deposit Refund & 90-Min Breakdown SLA\n\n"
        + "Ask me about any machine name, rental pricing, or delivery details!";
  }

  private List<EquipmentCardDto> matchEquipmentToQuery(String query, List<Asset> assets) {
    String lower = query.toLowerCase();
    List<Asset> matches = new ArrayList<>();

    for (Asset a : assets) {
      String name = a.getName().toLowerCase();
      String tag = a.getAssetTag().toLowerCase();

      boolean match = false;
      if (lower.contains("weeder") && (name.contains("weeder") || tag.contains("wed")))
        match = true;
      else if ((lower.contains("reaper")
              || lower.contains("harvest")
              || lower.contains("crop")
              || lower.contains("paddy")
              || lower.contains("wheat"))
          && (name.contains("reaper") || tag.contains("rep"))) match = true;
      else if ((lower.contains("auger")
              || lower.contains("hole")
              || lower.contains("digger")
              || lower.contains("gaddha"))
          && (name.contains("auger") || tag.contains("aug"))) match = true;
      else if ((lower.contains("mixer")
              || lower.contains("concrete mixer")
              || lower.contains("cement"))
          && (name.contains("mixer") || tag.contains("mix"))) match = true;
      else if ((lower.contains("vibrator") || lower.contains("needle"))
          && (name.contains("vibrator") || tag.contains("vib"))) match = true;
      else if ((lower.contains("compactor") || lower.contains("roller") || lower.contains("plate"))
          && (name.contains("compactor") || tag.contains("cmp"))) match = true;
      else if ((lower.contains("hammer")
              || lower.contains("jackhammer")
              || lower.contains("demolition")
              || lower.contains("breaker"))
          && (name.contains("jackhammer") || tag.contains("jck"))) match = true;
      else if ((lower.contains("pump")
              || lower.contains("dewater")
              || lower.contains("water")
              || lower.contains("trash"))
          && (name.contains("pump") || tag.contains("pmp"))) match = true;
      else if ((lower.contains("generator") || lower.contains("power") || lower.contains("genset"))
          && (name.contains("generator") || tag.contains("gen"))) match = true;
      else if (lower.contains("agri") && a.getCategory() == AssetCategory.AGRICULTURE) match = true;
      else if (lower.contains("construction") && a.getCategory() == AssetCategory.CONSTRUCTION)
        match = true;

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
        .cityName(
            asset.getHub() != null && asset.getHub().getCity() != null
                ? asset.getHub().getCity().getName()
                : "Hardoi")
        .imageUrl(asset.getImageUrl())
        .bookingUrl("/booking?equipmentId=" + asset.getId())
        .keyFeatures(
            List.of("Zero-Downtime Guarantee", "2-Hour Deposit Refund", "Doorstep Farm Delivery"))
        .build();
  }

  private String resolveHindiName(String englishName) {
    if (englishName.contains("Mixer")) return "कंक्रीट मिलाने की मशीन (Concrete Mixer)";
    if (englishName.contains("Weeder")) return "खेत की जुताई व निराई-गुड़ाई की मशीन (Power Weeder)";
    if (englishName.contains("Reaper")) return "फसल/धान व गेहूँ काटने की मशीन (Crop Power Reaper)";
    if (englishName.contains("Auger"))
      return "जमीन में गड्ढा खोदने की मशीन (Post-Hole Earth Auger)";
    if (englishName.contains("Vibrator")) return "कंक्रीट बैठाने/कंपन की मशीन (Concrete Vibrator)";
    if (englishName.contains("Compactor"))
      return "मिट्टी व रोड़ी कुटाई/दबाने की मशीन (Plate Compactor)";
    if (englishName.contains("Jackhammer"))
      return "कंक्रीट व पत्थर तोड़ने की मशीन (Demolition Jackhammer)";
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
    list.add(
        Asset.builder()
            .id(1L)
            .assetTag("C-MIX-001")
            .model(
                com.equipgrid.master.entity.MachineModel.builder()
                    .name("10/7 Tilting Concrete Mixer (Diesel)")
                    .build())
            .type(
                com.equipgrid.master.entity.EquipmentType.builder()
                    .category(AssetCategory.CONSTRUCTION)
                    .build())
            .dailyRate(new BigDecimal("1200.00"))
            .depositAmount(new BigDecimal("5000.00"))
            .status(AssetStatus.AVAILABLE)
            .imageUrl("https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=800")
            .build());
    list.add(
        Asset.builder()
            .id(7L)
            .assetTag("A-WED-001")
            .model(
                com.equipgrid.master.entity.MachineModel.builder()
                    .name("Heavy-Duty 7HP Rotary Power Weeder")
                    .build())
            .type(
                com.equipgrid.master.entity.EquipmentType.builder()
                    .category(AssetCategory.AGRICULTURE)
                    .build())
            .dailyRate(new BigDecimal("1000.00"))
            .depositAmount(new BigDecimal("3500.00"))
            .status(AssetStatus.AVAILABLE)
            .imageUrl("https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=800")
            .build());
    list.add(
        Asset.builder()
            .id(8L)
            .assetTag("A-REP-001")
            .model(
                com.equipgrid.master.entity.MachineModel.builder()
                    .name("Walk-Behind Power Reaper (Paddy/Wheat)")
                    .build())
            .type(
                com.equipgrid.master.entity.EquipmentType.builder()
                    .category(AssetCategory.AGRICULTURE)
                    .build())
            .dailyRate(new BigDecimal("2500.00"))
            .depositAmount(new BigDecimal("8000.00"))
            .status(AssetStatus.AVAILABLE)
            .imageUrl("https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800")
            .build());
    list.add(
        Asset.builder()
            .id(9L)
            .assetTag("A-AUG-001")
            .model(
                com.equipgrid.master.entity.MachineModel.builder()
                    .name("Portable Post-Hole Earth Auger 68cc")
                    .build())
            .type(
                com.equipgrid.master.entity.EquipmentType.builder()
                    .category(AssetCategory.AGRICULTURE)
                    .build())
            .dailyRate(new BigDecimal("600.00"))
            .depositAmount(new BigDecimal("2000.00"))
            .status(AssetStatus.AVAILABLE)
            .imageUrl("https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800")
            .build());
    list.add(
        Asset.builder()
            .id(3L)
            .assetTag("C-VIB-001")
            .model(
                com.equipgrid.master.entity.MachineModel.builder()
                    .name("Petrol Engine Concrete Vibrator")
                    .build())
            .type(
                com.equipgrid.master.entity.EquipmentType.builder()
                    .category(AssetCategory.CONSTRUCTION)
                    .build())
            .dailyRate(new BigDecimal("400.00"))
            .depositAmount(new BigDecimal("2000.00"))
            .status(AssetStatus.AVAILABLE)
            .imageUrl("https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=800")
            .build());
    list.add(
        Asset.builder()
            .id(5L)
            .assetTag("C-CMP-001")
            .model(
                com.equipgrid.master.entity.MachineModel.builder()
                    .name("Forward Plate Compactor 5.5HP")
                    .build())
            .type(
                com.equipgrid.master.entity.EquipmentType.builder()
                    .category(AssetCategory.CONSTRUCTION)
                    .build())
            .dailyRate(new BigDecimal("800.00"))
            .depositAmount(new BigDecimal("4000.00"))
            .status(AssetStatus.AVAILABLE)
            .imageUrl("https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800")
            .build());
    return list;
  }
}
