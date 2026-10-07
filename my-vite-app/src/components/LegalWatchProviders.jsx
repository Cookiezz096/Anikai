import React, { useState, useEffect } from "react";
import { getWatchProviders, tmdbImage } from "../lib/tmdb";
import {
  Tv,
  Film,
  ExternalLink,
  Globe,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShoppingBag,
  DollarSign,
  Play
} from "lucide-react";

const REGIONS = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "JP", name: "Japan" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "BR", name: "Brazil" },
  { code: "IN", name: "India" },
  { code: "KR", name: "South Korea" },
];

export default function LegalWatchProviders({ mediaType = "movie", mediaId, mediaTitle = "this title" }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [providerData, setProviderData] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState("US");
  const [activeTab, setActiveTab] = useState("flatrate");

  useEffect(() => {
    let isMounted = true;

    async function fetchProviders() {
      if (!mediaId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        const data = await getWatchProviders(mediaType, mediaId);
        if (isMounted) {
          setProviderData(data?.results || {});
          // If default US has no results, check if another popular country has it
          if (data?.results && !data.results["US"]) {
            const availableRegions = Object.keys(data.results);
            if (availableRegions.length > 0) {
              const matched = REGIONS.find((r) => availableRegions.includes(r.code));
              if (matched) setSelectedRegion(matched.code);
              else setSelectedRegion(availableRegions[0]);
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          setError("Unable to load authorized streaming providers at this time.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchProviders();

    return () => {
      isMounted = false;
    };
  }, [mediaType, mediaId]);

  const regionData = providerData ? providerData[selectedRegion] : null;

  const flatrate = regionData?.flatrate || [];
  const free = regionData?.free || [];
  const ads = regionData?.ads || [];
  const rent = regionData?.rent || [];
  const buy = regionData?.buy || [];
  const tmdbLink = regionData?.link || `https://www.themoviedb.org/${mediaType === "movie" ? "movie" : "tv"}/${mediaId}/watch`;

  const totalStreamOptions = flatrate.length + free.length + ads.length;
  const hasOptions = totalStreamOptions > 0 || rent.length > 0 || buy.length > 0;

  // Auto switch tab if active tab has 0 items
  useEffect(() => {
    if (!regionData) return;
    if (activeTab === "flatrate" && flatrate.length === 0) {
      if (free.length > 0 || ads.length > 0) setActiveTab("free");
      else if (rent.length > 0) setActiveTab("rent");
      else if (buy.length > 0) setActiveTab("buy");
    }
  }, [regionData, activeTab, flatrate.length, free.length, ads.length, rent.length, buy.length]);

  return (
    <div className="legal-providers-container">
      {/* Header */}
      <div className="legal-providers-header">
        <div className="legal-providers-title-group">
          <div className="legal-badge-icon">
            <CheckCircle2 size={18} className="text-accent-green" />
          </div>
          <div>
            <h3 className="legal-providers-heading">Official Streaming & Watch Options</h3>
            <p className="legal-providers-subtext">
              Authorized platforms carrying {mediaTitle} in full HD/4K
            </p>
          </div>
        </div>

        {/* Region Selector */}
        <div className="legal-region-selector">
          <Globe size={14} className="region-icon" />
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="region-select-input"
            aria-label="Select Country/Region"
          >
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name} ({r.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="legal-providers-loading">
          <div className="providers-spinner" />
          <span>Locating licensed streaming services for {selectedRegion}...</span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="legal-providers-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {hasOptions ? (
            <div className="legal-providers-content">
              {/* Category Tabs */}
              <div className="provider-tabs">
                <button
                  className={`provider-tab-btn ${activeTab === "flatrate" ? "active" : ""}`}
                  onClick={() => setActiveTab("flatrate")}
                >
                  <Play size={13} />
                  <span>Subscription ({flatrate.length})</span>
                </button>

                {(free.length > 0 || ads.length > 0) && (
                  <button
                    className={`provider-tab-btn ${activeTab === "free" ? "active" : ""}`}
                    onClick={() => setActiveTab("free")}
                  >
                    <Sparkles size={13} />
                    <span>Free / Ads ({free.length + ads.length})</span>
                  </button>
                )}

                {rent.length > 0 && (
                  <button
                    className={`provider-tab-btn ${activeTab === "rent" ? "active" : ""}`}
                    onClick={() => setActiveTab("rent")}
                  >
                    <DollarSign size={13} />
                    <span>Rent ({rent.length})</span>
                  </button>
                )}

                {buy.length > 0 && (
                  <button
                    className={`provider-tab-btn ${activeTab === "buy" ? "active" : ""}`}
                    onClick={() => setActiveTab("buy")}
                  >
                    <ShoppingBag size={13} />
                    <span>Buy ({buy.length})</span>
                  </button>
                )}
              </div>

              {/* Provider Logos Grid */}
              <div className="provider-grid">
                {activeTab === "flatrate" && (
                  flatrate.length > 0 ? (
                    flatrate.map((provider) => (
                      <a
                        key={provider.provider_id}
                        href={tmdbLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="provider-card"
                        title={`Watch on ${provider.provider_name}`}
                      >
                        <div className="provider-logo-wrap">
                          {provider.logo_path ? (
                            <img
                              src={tmdbImage(provider.logo_path, "w92")}
                              alt={provider.provider_name}
                              className="provider-logo-img"
                              loading="lazy"
                            />
                          ) : (
                            <div className="provider-logo-fallback">
                              <Tv size={20} />
                            </div>
                          )}
                        </div>
                        <span className="provider-name">{provider.provider_name}</span>
                        <span className="provider-action-tag">Stream</span>
                      </a>
                    ))
                  ) : (
                    <div className="provider-empty-tab">
                      No flatrate subscription streaming currently active in {selectedRegion}.
                    </div>
                  )
                )}

                {activeTab === "free" && (
                  [...free, ...ads].map((provider) => (
                    <a
                      key={provider.provider_id}
                      href={tmdbLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="provider-card free-tier"
                      title={`Stream free on ${provider.provider_name}`}
                    >
                      <div className="provider-logo-wrap">
                        {provider.logo_path ? (
                          <img
                            src={tmdbImage(provider.logo_path, "w92")}
                            alt={provider.provider_name}
                            className="provider-logo-img"
                            loading="lazy"
                          />
                        ) : (
                          <div className="provider-logo-fallback">
                            <Sparkles size={20} />
                          </div>
                        )}
                      </div>
                      <span className="provider-name">{provider.provider_name}</span>
                      <span className="provider-action-tag tag-free">Free to Stream</span>
                    </a>
                  ))
                )}

                {activeTab === "rent" && (
                  rent.map((provider) => (
                    <a
                      key={provider.provider_id}
                      href={tmdbLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="provider-card"
                      title={`Rent on ${provider.provider_name}`}
                    >
                      <div className="provider-logo-wrap">
                        <img
                          src={tmdbImage(provider.logo_path, "w92")}
                          alt={provider.provider_name}
                          className="provider-logo-img"
                          loading="lazy"
                        />
                      </div>
                      <span className="provider-name">{provider.provider_name}</span>
                      <span className="provider-action-tag">Rent HD</span>
                    </a>
                  ))
                )}

                {activeTab === "buy" && (
                  buy.map((provider) => (
                    <a
                      key={provider.provider_id}
                      href={tmdbLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="provider-card"
                      title={`Purchase on ${provider.provider_name}`}
                    >
                      <div className="provider-logo-wrap">
                        <img
                          src={tmdbImage(provider.logo_path, "w92")}
                          alt={provider.provider_name}
                          className="provider-logo-img"
                          loading="lazy"
                        />
                      </div>
                      <span className="provider-name">{provider.provider_name}</span>
                      <span className="provider-action-tag">Buy & Own</span>
                    </a>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="legal-providers-none">
              <Film size={28} className="empty-film-icon" />
              <div className="empty-text-wrap">
                <div className="empty-title">No direct digital streams listed in {selectedRegion}</div>
                <div className="empty-desc">
                  Try switching your region above or check physical media releases.
                </div>
              </div>
            </div>
          )}

          {/* JustWatch / TMDB Attribution Footer */}
          <div className="legal-providers-footer">
            <span>Streaming data powered by <strong>JustWatch</strong> via TMDB</span>
            <a
              href={tmdbLink}
              target="_blank"
              rel="noopener noreferrer"
              className="justwatch-direct-link"
            >
              <span>View all regional offerings</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </>
      )}
    </div>
  );
}
