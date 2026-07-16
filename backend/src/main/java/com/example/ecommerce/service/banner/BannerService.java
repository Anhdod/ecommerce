package com.example.ecommerce.service.banner;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.ecommerce.dto.banner.BannerRequest;
import com.example.ecommerce.dto.banner.BannerResponse;
import com.example.ecommerce.entity.banner.Banner;
import com.example.ecommerce.repository.banner.BannerRepository;

@Service
public class BannerService {

    @Autowired
    private BannerRepository bannerRepository;

    public List<BannerResponse> getActiveBanners() {
        return bannerRepository.findByActiveTrueOrderBySortOrderAscCreatedAtDesc().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<BannerResponse> getAllBanners() {
        return bannerRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public BannerResponse getBanner(Long id) {
        return toResponse(bannerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Khong tim thay banner")));
    }

    @Transactional
    public BannerResponse createBanner(BannerRequest request) {
        Banner banner = Banner.builder()
                .title(request.getTitle())
                .subtitle(request.getSubtitle())
                .imageUrl(request.getImageUrl())
                .linkUrl(request.getLinkUrl())
                .active(request.getActive() == null ? true : request.getActive())
                .sortOrder(request.getSortOrder() == null ? 0 : request.getSortOrder())
                .build();
        return toResponse(bannerRepository.save(banner));
    }

    @Transactional
    public BannerResponse updateBanner(Long id, BannerRequest request) {
        Banner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Khong tim thay banner"));
        if (request.getTitle() != null) banner.setTitle(request.getTitle());
        if (request.getSubtitle() != null) banner.setSubtitle(request.getSubtitle());
        if (request.getImageUrl() != null) banner.setImageUrl(request.getImageUrl());
        if (request.getLinkUrl() != null) banner.setLinkUrl(request.getLinkUrl());
        if (request.getActive() != null) banner.setActive(request.getActive());
        if (request.getSortOrder() != null) banner.setSortOrder(request.getSortOrder());
        return toResponse(bannerRepository.save(banner));
    }

    @Transactional
    public void deleteBanner(Long id) {
        bannerRepository.deleteById(id);
    }

    private BannerResponse toResponse(Banner banner) {
        return BannerResponse.builder()
                .id(banner.getId())
                .title(banner.getTitle())
                .subtitle(banner.getSubtitle())
                .imageUrl(banner.getImageUrl())
                .linkUrl(banner.getLinkUrl())
                .active(banner.isActive())
                .sortOrder(banner.getSortOrder())
                .createdAt(banner.getCreatedAt())
                .build();
    }
}
