import React, { useState, useEffect, useMemo } from 'react';
import { Server, Tv, ShieldCheck } from 'lucide-react';
import { generateDynamicCategories } from '../data/sources.js';

export default function WatchPage({ animeId = "one-piece", totalEpisodes = 24, type = "tv" }) {
    const [episodeNum, setEpisodeNum] = useState(1);
    const [activeServer, setActiveServer] = useState(null);
    const [videoUrl, setVideoUrl] = useState('');

    // Build servers client-side — no backend needed
    const servers = useMemo(() => {
        try {
            const categories = generateDynamicCategories({
                contentType: type === "tv" ? "anime" : "movie",
                type,
                id: animeId,
                season: 1,
                episode: episodeNum,
            });
            // Flatten sub sources for the server selector
            return categories?.sub?.sources || [];
        } catch {
            return [];
        }
    }, [animeId, episodeNum, type]);

    // Auto-select first server when list changes
    useEffect(() => {
        if (servers.length > 0) {
            setActiveServer(servers[0].name);
            setVideoUrl(servers[0].url);
        } else {
            setActiveServer(null);
            setVideoUrl('');
        }
    }, [servers]);

    const handleServerChange = (srv) => {
        setActiveServer(srv.name);
        setVideoUrl(srv.url);
    };

    return (
        <div style={styles.aniwaveGrid}>

            {/* LEFT ASPECT COLUMN (75% Media Control Block) */}
            <div style={styles.mainContentColumn}>

                <div style={styles.theaterRowWrapper}>

                    {/* Aniwave Style Left Sticky Episode Bar */}
                    <div style={styles.episodeSidebar}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                            <Tv size={16} color="#8b5cf6" />
                            <h4 style={{ margin: 0, fontSize: '14px', color: '#eaeaea', fontWeight: 'bold' }}>Episodes</h4>
                        </div>
                        <div style={styles.episodeButtonGrid}>
                            {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((ep) => (
                                <button
                                    key={ep}
                                    onClick={() => setEpisodeNum(ep)}
                                    style={{
                                        ...styles.epBtn,
                                        backgroundColor: episodeNum === ep ? '#8b5cf6' : '#1a1c23',
                                        border: episodeNum === ep ? '1px solid #a78bfa' : '1px solid #282a36'
                                    }}
                                >
                                    {ep}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Secure Video Player Window Box */}
                    <div style={styles.videoViewportContainer}>
                        {videoUrl ? (
                            <iframe
                                src={videoUrl}
                                style={styles.iframeViewport}
                                allowFullScreen
                                scrolling="no"
                                sandbox="allow-scripts allow-same-origin allow-forms"
                            />
                        ) : (
                            <div style={styles.loadingPlaceholder}>
                                <div className="spin" style={{ marginBottom: '10px' }}>⏳</div>
                                Loading stream...
                            </div>
                        )}
                    </div>
                </div>

                {/* Server Selection Bar Layout */}
                <div style={styles.serverRowPanel}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af' }}>
                        <Server size={15} color="#8b5cf6" />
                        <span style={{ fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.5px' }}>SERVERS:</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {servers.map((srv, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleServerChange(srv)}
                                style={{
                                    ...styles.serverButton,
                                    backgroundColor: activeServer === srv.name ? '#8b5cf6' : '#1e202b',
                                    border: activeServer === srv.name ? '1px solid #a78bfa' : '1px solid #2d3142'
                                }}
                            >
                                {srv.name.toUpperCase()}
                            </button>
                        ))}
                        {servers.length === 0 && (
                            <span style={{ fontSize: '12px', color: '#ef4444' }}>No active streams found for this track.</span>
                        )}
                    </div>
                </div>

            </div>

            {/* RIGHT SIDEBAR ASPECT COLUMN (25% Layout Spacer) */}
            <aside style={styles.sidebarColumn}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '15px', borderBottom: '1px solid #232635', paddingBottom: '10px' }}>
                    <ShieldCheck size={16} color="#8b5cf6" />
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>Playback Health</h3>
                </div>
                <p style={{ fontSize: '12px', color: '#9ca3af', lineHeight: '1.5' }}>
                    If the video displays cross-origin buffering loops or stays frozen, use the top server options panel to shift mirrors instantly.
                </p>
            </aside>

        </div>
    );
}

// Fixed styling parameters mapping the exact matte-black Aniwave atmosphere
const styles = {
    aniwaveGrid: { display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px', maxWidth: '1450px', margin: '0 auto', padding: '20px' },
    mainContentColumn: { display: 'flex', flexDirection: 'column', gap: '16px' },
    theaterRowWrapper: { display: 'flex', gap: '14px', height: '490px' },
    episodeSidebar: { width: '230px', background: '#11131c', borderRadius: '6px', padding: '15px', overflowY: 'auto', border: '1px solid #1e2235' },
    episodeButtonGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' },
    epBtn: { color: '#fff', padding: '8px 4px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', transition: 'all 0.15s' },
    videoViewportContainer: { flex: 1, background: '#000', borderRadius: '6px', overflow: 'hidden', border: '1px solid #1e2235', position: 'relative' },
    loadingPlaceholder: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#9ca3af', fontSize: '14px', textAlign: 'center' },
    iframeViewport: { width: '100%', height: '100%', border: 'none' },
    serverRowPanel: { background: '#11131c', padding: '14px 20px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid #1e2235' },
    serverButton: { color: '#fff', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', letterSpacing: '0.3px', transition: 'all 0.2s' },
    sidebarColumn: { background: '#11131c', borderRadius: '6px', padding: '20px', height: 'fit-content', border: '1px solid #1e2235', color: '#f3f4f6' }
};
