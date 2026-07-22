package com.example.ecommerce.entity.product;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.LinkedHashMap;
import java.util.Map;

@Converter
public class AttributeMapConverter implements AttributeConverter<Map<String, String>, String> {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<LinkedHashMap<String, String>> MAP_TYPE = new TypeReference<>() {};

    @Override
    public String convertToDatabaseColumn(Map<String, String> attributes) {
        try {
            return OBJECT_MAPPER.writeValueAsString(attributes == null ? Map.of() : attributes);
        } catch (Exception exception) {
            throw new IllegalArgumentException("Không thể lưu thuộc tính biến thể", exception);
        }
    }

    @Override
    public Map<String, String> convertToEntityAttribute(String json) {
        if (json == null || json.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            return OBJECT_MAPPER.readValue(json, MAP_TYPE);
        } catch (Exception exception) {
            throw new IllegalArgumentException("Không thể đọc thuộc tính biến thể", exception);
        }
    }
}
