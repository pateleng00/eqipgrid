package com.equipgrid.location.controller;

import com.equipgrid.common.dto.rest.ApiResponse;
import com.equipgrid.common.dto.rest.MessageApiResponse;
import com.equipgrid.location.entity.City;
import com.equipgrid.location.entity.Hub;
import com.equipgrid.location.entity.State;
import com.equipgrid.location.repository.CityRepository;
import com.equipgrid.location.repository.HubRepository;
import com.equipgrid.location.repository.StateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/locations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LocationController {

    private final StateRepository stateRepository;
    private final CityRepository cityRepository;
    private final HubRepository hubRepository;

    @GetMapping("/states")
    public ResponseEntity<ApiResponse<List<State>>> getStates() {
        List<State> states = stateRepository.findByActiveTrueOrderByNameAsc();
        return ResponseEntity.ok(new ApiResponse<>(true, new MessageApiResponse("States fetched"), states, null));
    }

    @PostMapping("/states")
    public ResponseEntity<ApiResponse<State>> createState(@RequestBody State state) {
        State saved = stateRepository.save(state);
        return ResponseEntity.ok(new ApiResponse<>(true, new MessageApiResponse("State created"), saved, null));
    }

    @GetMapping("/states/{stateId}/cities")
    public ResponseEntity<ApiResponse<List<City>>> getCitiesByState(@PathVariable Long stateId) {
        List<City> cities = cityRepository.findByStateIdAndActiveTrueOrderByNameAsc(stateId);
        return ResponseEntity.ok(new ApiResponse<>(true, new MessageApiResponse("Cities fetched for state"), cities, null));
    }

    @GetMapping("/cities")
    public ResponseEntity<ApiResponse<List<City>>> getAllCities() {
        List<City> cities = cityRepository.findByActiveTrueOrderByNameAsc();
        return ResponseEntity.ok(new ApiResponse<>(true, new MessageApiResponse("All cities fetched"), cities, null));
    }

    @PostMapping("/cities")
    public ResponseEntity<ApiResponse<City>> createCity(@RequestBody CityRequest request) {
        State state = stateRepository.findById(request.stateId())
                .orElseThrow(() -> new IllegalArgumentException("State not found: " + request.stateId()));
        City city = City.builder()
                .state(state)
                .name(request.name())
                .pinCode(request.pinCode())
                .active(true)
                .build();
        City saved = cityRepository.save(city);
        return ResponseEntity.ok(new ApiResponse<>(true, new MessageApiResponse("City created successfully"), saved, null));
    }

    @GetMapping("/cities/{cityId}/hubs")
    public ResponseEntity<ApiResponse<List<Hub>>> getHubsByCity(@PathVariable Long cityId) {
        List<Hub> hubs = hubRepository.findByCityIdAndActiveTrueOrderByNameAsc(cityId);
        return ResponseEntity.ok(new ApiResponse<>(true, new MessageApiResponse("Hubs fetched for city"), hubs, null));
    }

    @GetMapping("/hubs")
    public ResponseEntity<ApiResponse<List<Hub>>> getAllHubs() {
        List<Hub> hubs = hubRepository.findByActiveTrueOrderByNameAsc();
        return ResponseEntity.ok(new ApiResponse<>(true, new MessageApiResponse("All hubs fetched"), hubs, null));
    }

    @PostMapping("/hubs")
    public ResponseEntity<ApiResponse<Hub>> createHub(@RequestBody HubRequest request) {
        City city = cityRepository.findById(request.cityId())
                .orElseThrow(() -> new IllegalArgumentException("City not found: " + request.cityId()));
        Hub hub = Hub.builder()
                .city(city)
                .name(request.name())
                .code(request.code())
                .address(request.address())
                .contactPhone(request.contactPhone())
                .latitude(request.latitude())
                .longitude(request.longitude())
                .operatingRadiusKm(request.operatingRadiusKm() != null ? request.operatingRadiusKm() : new java.math.BigDecimal("25.0"))
                .active(true)
                .build();
        Hub saved = hubRepository.save(hub);
        return ResponseEntity.ok(new ApiResponse<>(true, new MessageApiResponse("Hub yard created successfully"), saved, null));
    }

    public record CityRequest(Long stateId, String name, String pinCode) {}
    public record HubRequest(
            Long cityId,
            String name,
            String code,
            String address,
            String contactPhone,
            java.math.BigDecimal operatingRadiusKm,
            java.math.BigDecimal latitude,
            java.math.BigDecimal longitude
    ) {}
}
