package com.equipgrid.booking.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.stereotype.Component;

@Component
public class DistanceCalculator {
  private static final double EARTH_RADIUS_KM = 6371.0088d;

  public BigDecimal kilometres(
      BigDecimal originLatitude,
      BigDecimal originLongitude,
      BigDecimal destinationLatitude,
      BigDecimal destinationLongitude) {
    if (originLatitude == null
        || originLongitude == null
        || destinationLatitude == null
        || destinationLongitude == null) {
      return null;
    }
    double lat1 = Math.toRadians(originLatitude.doubleValue());
    double lat2 = Math.toRadians(destinationLatitude.doubleValue());
    double latitudeDelta = lat2 - lat1;
    double longitudeDelta =
        Math.toRadians(destinationLongitude.doubleValue() - originLongitude.doubleValue());
    double a =
        Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2)
            + Math.cos(lat1)
                * Math.cos(lat2)
                * Math.sin(longitudeDelta / 2)
                * Math.sin(longitudeDelta / 2);
    double distance = EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return BigDecimal.valueOf(distance).setScale(2, RoundingMode.HALF_UP);
  }
}
