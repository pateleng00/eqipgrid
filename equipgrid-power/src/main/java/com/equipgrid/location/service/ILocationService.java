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

  State createState(State state);

  List<City> getCitiesByState(Long stateId);

  List<City> getAllCities();

  City createCity(CityRequest request);

  List<Hub> getHubsByCity(Long cityId);

  List<Hub> getAllHubs();

  Hub createHub(HubRequest request);

  List<StateHierarchyResponse> getLocationHierarchy();
}
