package com.example.ecommerce.service.auth;

import com.example.ecommerce.dto.auth.AddressRequest;
import com.example.ecommerce.dto.auth.AddressResponse;
import com.example.ecommerce.entity.auth.Address;
import com.example.ecommerce.entity.auth.User;
import com.example.ecommerce.repository.auth.AddressRepository;
import com.example.ecommerce.repository.auth.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AddressService {

    @Autowired
    private AddressRepository addressRepository;

    @Autowired
    private UserRepository userRepository;

    public List<AddressResponse> getMyAddresses() {
        User user = getCurrentUser();
        return addressRepository.findByUserIdOrderByDefaultAddressDescIdDesc(user.getId())
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public AddressResponse getAddressById(Long addressId) {
        User user = getCurrentUser();
        Address address = addressRepository.findByIdAndUserId(addressId, user.getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy địa chỉ"));

        return convertToResponse(address);
    }

    @Transactional
    public AddressResponse createAddress(AddressRequest request) {
        User user = getCurrentUser();
        Address address = buildAddress(request, user);

        if (Boolean.TRUE.equals(request.getDefaultAddress())
                || addressRepository.findByUserIdOrderByDefaultAddressDescIdDesc(user.getId()).isEmpty()) {
            clearDefaultAddress(user);
            address.setDefaultAddress(true);
        }

        Address saved = addressRepository.save(address);
        return convertToResponse(saved);
    }

    @Transactional
    public AddressResponse updateAddress(Long addressId, AddressRequest request) {
        User user = getCurrentUser();
        Address address = addressRepository.findByIdAndUserId(addressId, user.getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy địa chỉ"));

        if (request.getLabel() != null) {
            address.setLabel(request.getLabel());
        }
        if (request.getRecipientName() != null) {
            address.setRecipientName(request.getRecipientName());
        }
        if (request.getPhoneNumber() != null) {
            address.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getAddressLine() != null) {
            address.setAddressLine(request.getAddressLine());
        }
        if (request.getCity() != null) {
            address.setCity(request.getCity());
        }
        if (request.getProvince() != null) {
            address.setProvince(request.getProvince());
        }
        if (request.getPostalCode() != null) {
            address.setPostalCode(request.getPostalCode());
        }

        if (Boolean.TRUE.equals(request.getDefaultAddress())) {
            clearDefaultAddress(user);
            address.setDefaultAddress(true);
        }

        Address updated = addressRepository.save(address);
        return convertToResponse(updated);
    }

    @Transactional
    public void deleteAddress(Long addressId) {
        User user = getCurrentUser();
        Address address = addressRepository.findByIdAndUserId(addressId, user.getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy địa chỉ"));

        boolean wasDefault = address.isDefaultAddress();
        addressRepository.delete(address);

        if (wasDefault) {
            addressRepository.findByUserIdOrderByDefaultAddressDescIdDesc(user.getId()).stream()
                    .findFirst()
                    .ifPresent(defaultAddress -> {
                        defaultAddress.setDefaultAddress(true);
                        addressRepository.save(defaultAddress);
                    });
        }
    }

    @Transactional
    public AddressResponse setDefaultAddress(Long addressId) {
        User user = getCurrentUser();
        Address address = addressRepository.findByIdAndUserId(addressId, user.getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy địa chỉ"));

        clearDefaultAddress(user);
        address.setDefaultAddress(true);
        return convertToResponse(addressRepository.save(address));
    }

    public AddressResponse getDefaultAddress() {
        User user = getCurrentUser();
        return addressRepository.findByUserIdAndDefaultAddressTrue(user.getId())
                .map(this::convertToResponse)
                .orElse(null);
    }

    public Address getDefaultAddressEntity() {
        User user = getCurrentUser();
        return addressRepository.findByUserIdAndDefaultAddressTrue(user.getId()).orElse(null);
    }

    public Address getAddressEntityById(Long addressId) {
        User user = getCurrentUser();
        return addressRepository.findByIdAndUserId(addressId, user.getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy địa chỉ"));
    }

    private void clearDefaultAddress(User user) {
        addressRepository.findByUserIdOrderByDefaultAddressDescIdDesc(user.getId()).stream()
                .filter(Address::isDefaultAddress)
                .forEach(address -> {
                    address.setDefaultAddress(false);
                    addressRepository.save(address);
                });
    }

    private Address buildAddress(AddressRequest request, User user) {
        return Address.builder()
                .user(user)
                .label(request.getLabel())
                .recipientName(request.getRecipientName())
                .phoneNumber(request.getPhoneNumber())
                .addressLine(request.getAddressLine())
                .city(request.getCity())
                .province(request.getProvince())
                .postalCode(request.getPostalCode())
                .defaultAddress(Boolean.TRUE.equals(request.getDefaultAddress()))
                .build();
    }

    private AddressResponse convertToResponse(Address address) {
        return AddressResponse.builder()
                .id(address.getId())
                .label(address.getLabel())
                .recipientName(address.getRecipientName())
                .phoneNumber(address.getPhoneNumber())
                .addressLine(address.getAddressLine())
                .city(address.getCity())
                .province(address.getProvince())
                .postalCode(address.getPostalCode())
                .defaultAddress(address.isDefaultAddress())
                .createdAt(address.getCreatedAt())
                .updatedAt(address.getUpdatedAt())
                .build();
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
    }
}
