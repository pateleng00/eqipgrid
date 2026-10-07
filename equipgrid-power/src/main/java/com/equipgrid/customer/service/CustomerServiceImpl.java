package com.equipgrid.customer.service;

import com.equipgrid.audit.service.IAuditService;
import com.equipgrid.common.Exceptions;
import com.equipgrid.customer.dto.request.CreateCustomerRequest;
import com.equipgrid.customer.dto.request.VerifyCustomerRequest;
import com.equipgrid.customer.entity.Customer;
import com.equipgrid.customer.repository.CustomerQueryRepository;
import com.equipgrid.customer.repository.CustomerRepository;
import com.equipgrid.location.repository.HubRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@AllArgsConstructor
public class CustomerServiceImpl implements ICustomerService {

    private final CustomerRepository customerRepository;
    private final CustomerQueryRepository customerQueryRepository;
    private final HubRepository hubRepository;
    private final IAuditService auditService;

    @Override
    public List<Customer> getAllCustomers() {
        return customerQueryRepository.fetchAll();
    }

    @Override
    public Customer getCustomerById(Long id) {
        return customerQueryRepository.fetchById(id)
                .orElseThrow(() -> new Exceptions.ResourceNotFoundException("Customer not found with ID: " + id));
    }

    @Override
    public Customer getCustomerByPhone(String phone) {
        return customerQueryRepository.fetchByPhone(phone)
                .orElseThrow(() -> new Exceptions.ResourceNotFoundException("Customer not found with phone: " + phone));
    }

    @Override
    @Transactional
    public Customer createOrUpdateCustomer(CreateCustomerRequest request, String performedBy) {
        Customer customer = customerQueryRepository.fetchByPhone(request.getPhone())
                .orElseGet(() -> Customer.builder().phone(request.getPhone()).build());

        customer.setFullName(request.getFullName());
        customer.setEmail(request.getEmail());
        customer.setAddress(request.getAddress());
        customer.setAadhaarNumber(request.getAadhaarNumber());
        customer.setGstNumber(request.getGstNumber());
        if (request.getTier() != null) customer.setTier(request.getTier());
        if (request.getVerified() != null) customer.setVerified(request.getVerified());
        if (request.getNotes() != null) customer.setNotes(request.getNotes());
        if (request.getHubId() != null) {
            hubRepository.findById(request.getHubId()).ifPresent(customer::setHub);
        }

        Customer saved = customerRepository.save(customer);
        auditService.log("CUSTOMER", saved.getId().toString(), "SAVE_CUSTOMER",
                performedBy != null ? performedBy : "SYSTEM",
                "Customer profile created/updated: " + saved.getFullName());
        return saved;
    }

    @Override
    @Transactional
    public Customer verifyCustomer(Long id, VerifyCustomerRequest request, String performedBy) {
        Customer customer = getCustomerById(id);
        if (request.getTier() != null) customer.setTier(request.getTier());
        if (request.getVerified() != null) customer.setVerified(request.getVerified());
        if (request.getNotes() != null) customer.setNotes(request.getNotes());

        Customer updated = customerRepository.save(customer);
        auditService.log("CUSTOMER", updated.getId().toString(), "VERIFY_CUSTOMER",
                performedBy != null ? performedBy : "SYSTEM",
                "Customer tier updated to: " + updated.getTier() + ", verified: " + updated.getVerified());
        return updated;
    }
}
