package com.equipgrid.core.util;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

/** Builds styled, production-grade Excel workbooks with professional EquipGrid branding. */
public final class ExcelExportUtil {

  private ExcelExportUtil() {
    // Utility class
  }

  /**
   * Generates a formatted .xlsx byte stream from headers and row records.
   *
   * @param title Title of the report (e.g. "Machines on Rent Manifest")
   * @param subtitle Subtitle or SOP reference
   * @param filters Map of active operational filters (State, City, Hub, Date Horizon)
   * @param sheetName Safe name for the Excel worksheet tab
   * @param headers List of column header names
   * @param rows List of data rows (each containing cell values)
   * @return byte array of the .xlsx file ready for HTTP response streaming
   */
  public static byte[] generateWorkbook(
      String title,
      String subtitle,
      Map<String, String> filters,
      String sheetName,
      List<String> headers,
      List<List<Object>> rows) {

    try (XSSFWorkbook workbook = new XSSFWorkbook();
        ByteArrayOutputStream out = new ByteArrayOutputStream()) {

      Sheet sheet = workbook.createSheet(sanitizeSheetName(sheetName));
      sheet.setDisplayGridlines(true);

      // Colors: EquipGrid Forest Teal (#0D5C46)
      byte[] tealRgb = new byte[] {(byte) 13, (byte) 92, (byte) 70};
      XSSFColor headerColor = new XSSFColor(tealRgb, null);

      // Title Style (14pt, Bold, Dark Slate)
      XSSFFont titleFont = workbook.createFont();
      titleFont.setFontHeightInPoints((short) 14);
      titleFont.setBold(true);
      titleFont.setColor(new XSSFColor(new byte[] {(byte) 30, (byte) 41, (byte) 59}, null));

      CellStyle titleStyle = workbook.createCellStyle();
      titleStyle.setFont(titleFont);

      // Subtitle Style (10pt, Italic, Muted Gray)
      XSSFFont subFont = workbook.createFont();
      subFont.setFontHeightInPoints((short) 10);
      subFont.setItalic(true);
      subFont.setColor(new XSSFColor(new byte[] {(byte) 100, (byte) 116, (byte) 139}, null));

      CellStyle subStyle = workbook.createCellStyle();
      subStyle.setFont(subFont);

      // Filter Banner Style (9.5pt, Bold Key-Value, Light Slate Background)
      XSSFFont filterFont = workbook.createFont();
      filterFont.setFontHeightInPoints((short) 9);
      filterFont.setColor(new XSSFColor(new byte[] {(byte) 71, (byte) 85, (byte) 105}, null));

      CellStyle filterStyle = workbook.createCellStyle();
      filterStyle.setFont(filterFont);

      // Header Row Style (Teal background, White bold text, bordered)
      XSSFFont headerFont = workbook.createFont();
      headerFont.setFontHeightInPoints((short) 10);
      headerFont.setBold(true);
      headerFont.setColor(new XSSFColor(new byte[] {(byte) 255, (byte) 255, (byte) 255}, null));

      XSSFCellStyle headerStyle = workbook.createCellStyle();
      headerStyle.setFillForegroundColor(headerColor);
      headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
      headerStyle.setFont(headerFont);
      headerStyle.setAlignment(HorizontalAlignment.LEFT);
      headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
      setBorder(headerStyle, BorderStyle.THIN);

      // Data Cell Styles
      XSSFFont dataFont = workbook.createFont();
      dataFont.setFontHeightInPoints((short) 9.5);

      CellStyle regularStyle = workbook.createCellStyle();
      regularStyle.setFont(dataFont);
      regularStyle.setVerticalAlignment(VerticalAlignment.CENTER);
      setBorder(regularStyle, BorderStyle.THIN);

      CellStyle alternateStyle = workbook.createCellStyle();
      alternateStyle.setFont(dataFont);
      alternateStyle.setVerticalAlignment(VerticalAlignment.CENTER);
      alternateStyle.setFillForegroundColor(
          new XSSFColor(new byte[] {(byte) 248, (byte) 250, (byte) 252}, null));
      alternateStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
      setBorder(alternateStyle, BorderStyle.THIN);

      int rowIdx = 0;

      // 1. Report Title Row
      Row titleRow = sheet.createRow(rowIdx++);
      titleRow.setHeightInPoints(24);
      Cell titleCell = titleRow.createCell(0);
      titleCell.setCellValue("EquipGrid Enterprise Reporting — " + title);
      titleCell.setCellStyle(titleStyle);

      // 2. Subtitle Row
      if (subtitle != null && !subtitle.isBlank()) {
        Row subRow = sheet.createRow(rowIdx++);
        subRow.setHeightInPoints(18);
        Cell subCell = subRow.createCell(0);
        subCell.setCellValue(subtitle);
        subCell.setCellStyle(subStyle);
      }

      // 3. Operational Filters Row
      if (filters != null && !filters.isEmpty()) {
        Row filterRow = sheet.createRow(rowIdx++);
        filterRow.setHeightInPoints(16);
        StringBuilder sb = new StringBuilder("Active Filters: ");
        filters.forEach((k, v) -> sb.append(k).append(" = ").append(v).append(" | "));
        String filterLine = sb.substring(0, Math.max(0, sb.length() - 3));
        Cell filterCell = filterRow.createCell(0);
        filterCell.setCellValue(filterLine);
        filterCell.setCellStyle(filterStyle);
      }

      // 4. Timestamp Row
      Row timeRow = sheet.createRow(rowIdx++);
      timeRow.setHeightInPoints(16);
      Cell timeCell = timeRow.createCell(0);
      timeCell.setCellValue(
          "Export Generated At: "
              + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy HH:mm:ss"))
              + " (IST)");
      timeCell.setCellStyle(filterStyle);

      // Blank spacing row
      sheet.createRow(rowIdx++).setHeightInPoints(8);

      // 5. Header Row
      Row headRow = sheet.createRow(rowIdx++);
      headRow.setHeightInPoints(26);
      for (int c = 0; c < headers.size(); c++) {
        Cell cell = headRow.createCell(c);
        cell.setCellValue(headers.get(c));
        cell.setCellStyle(headerStyle);
      }

      // 6. Data Rows
      for (int r = 0; r < rows.size(); r++) {
        List<Object> rowData = rows.get(r);
        Row dataRow = sheet.createRow(rowIdx++);
        dataRow.setHeightInPoints(20);
        CellStyle currentStyle = (r % 2 == 1) ? alternateStyle : regularStyle;

        for (int c = 0; c < headers.size(); c++) {
          Cell cell = dataRow.createCell(c);
          cell.setCellStyle(currentStyle);

          Object val = (c < rowData.size()) ? rowData.get(c) : "";
          if (val instanceof Number num) {
            cell.setCellValue(num.doubleValue());
          } else if (val instanceof Boolean b) {
            cell.setCellValue(b);
          } else {
            cell.setCellValue(val != null ? val.toString() : "");
          }
        }
      }

      // Auto-size columns with sane constraints
      for (int c = 0; c < headers.size(); c++) {
        sheet.autoSizeColumn(c);
        int currentWidth = sheet.getColumnWidth(c);
        int minWidth = 14 * 256;
        int maxWidth = 48 * 256;
        if (currentWidth < minWidth) {
          sheet.setColumnWidth(c, minWidth);
        } else if (currentWidth > maxWidth) {
          sheet.setColumnWidth(c, maxWidth);
        }
      }

      workbook.write(out);
      return out.toByteArray();
    } catch (IOException e) {
      throw new RuntimeException("Failed to generate Excel report workbook: " + e.getMessage(), e);
    }
  }

  private static void setBorder(CellStyle style, BorderStyle border) {
    style.setBorderTop(border);
    style.setBorderBottom(border);
    style.setBorderLeft(border);
    style.setBorderRight(border);
  }

  private static String sanitizeSheetName(String sheetName) {
    if (sheetName == null || sheetName.isBlank()) {
      return "ReportData";
    }
    String cleaned = sheetName.replaceAll("[:\\\\/?*\\[\\]]", " ").trim();
    return cleaned.length() > 31 ? cleaned.substring(0, 31) : cleaned;
  }
}
