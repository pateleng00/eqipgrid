package com.equipgrid.customer.service;

import com.equipgrid.customer.dto.request.CreateCustomerRequest;
import com.equipgrid.customer.dto.request.VerifyCustomerRequest;
import com.equipgrid.customer.entity.Customer;

import java.util.List;

public interface ICustomerService {
    List<Customer> getAllCustomers();

    Customer getCustomerById(Long id);

    Customer getCustomerByPhone(String phone);

    Customer createOrUpdateCustomer(CreateCustomerRequest request, String performedBy);

    Customer verifyCustomer(Long id, VerifyCustomerRequest request, String performedBy);
}
