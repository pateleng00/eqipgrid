package com.equipgrid.location.service;

import com.equipgrid.location.dto.request.CityRequest;
import com.equipgrid.location.dto.request.HubRequest;
import com.equipgrid.location.dto.response.StateHierarchyResponse;
import com.equipgrid.location.entity.City;
import com.equipgrid.location.entity.Hub;
import com.equipgrid.location.entity.State;
import java.util.List;

public interface ILocationService {

  List<State> getStates();

  List<State> getStates(boolean includeInactive);

  State createState(State state);

  List<City> getCitiesByState(Long stateId);

  List<City> getAllCities();

  List<City> getAllCities(boolean includeInactive);

  City createCity(CityRequest request);

  List<Hub> getHubsByCity(Long cityId);

  List<Hub> getAllHubs();

  List<Hub> getAllHubs(boolean includeInactive);

  Hub createHub(HubRequest request);

  List<StateHierarchyResponse> getLocationHierarchy();

  State updateStateStatus(Long stateId, boolean active);

  City updateCityStatus(Long cityId, boolean active);

  Hub updateHubStatus(Long hubId, boolean active);

  State updateState(Long stateId, State state);

  City updateCity(Long cityId, CityRequest request);

  Hub updateHub(Long hubId, HubRequest request);

  void deleteHub(Long hubId);

  void deleteCity(Long cityId);

  void deleteState(Long stateId);
}
