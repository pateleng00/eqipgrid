import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Truck, Plus, Search, RotateCcw, Zap, Building2, MapPin,
  Clock, UserCheck, Play, Pause, ChevronLeft, ChevronRight,
  Video, Images, X, Maximize2, Volume2, VolumeX, Star,
} from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { SearchSelect } from '../../components/SearchSelect';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { InfiniteScrollFooter } from '../../components/InfiniteScrollFooter';
import { formatINR } from '../../lib/utils';
import { useTheme } from '../../lib/ThemeContext';
import { useAuth } from '../../lib/AuthContext';
import { api } from '../../services/api';
import { Asset, AssetMedia } from '../../types';
import { AddMachineModal } from './AddMachineModal';
import { SkeletonTable } from '../../components/SkeletonTable';

interface EquipmentCatalogViewProps {
  onSelectForBooking: (asset: Asset) => void;
}

// ─── Media Carousel ────────────────────────────────────────────────────────────
const MediaCarousel: React.FC<{ asset: Asset; onExpand: () => void }> = ({ asset, onExpand }) => {
  const { isDaylight } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const images = asset.mediaItems?.filter(m => m.mediaType === 'IMAGE') ?? [];
  const video  = asset.mediaItems?.find(m => m.mediaType === 'VIDEO');

  // Build unified slide list: images first, then video tab
  const slides: Array<AssetMedia | 'video'> = [
    ...images,
    ...(video ? ['video' as const] : []),
  ];

  // Fallback to single imageUrl if no media gallery
  const hasGallery = slides.length > 0;
  const currentSlide = hasGallery ? slides[activeIdx] : null;
  const isVideoTab = currentSlide === 'video';

  const pauseVideo = () => {
    videoRef.current?.pause();
    setIsPlaying(false);
  };

  const playVideoInPlace = () => {
    if (!video) return;
    const vidIdx = slides.indexOf('video');
    if (vidIdx !== -1) {
      setActiveIdx(vidIdx);
    }
    setIsPlaying(true);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().catch(() => {});
          }
        });
      }
    }, 50);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    pauseVideo();
    setActiveIdx(i => (i - 1 + slides.length) % slides.length);
  };
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    pauseVideo();
    setActiveIdx(i => (i + 1) % slides.length);
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(m => !m);
  };

  const currentImageUrl = isVideoTab
    ? null
    : (currentSlide as AssetMedia | null)?.url ?? asset.imageUrl;

  return (
    <div className={`relative w-full h-40 sm:h-44 overflow-hidden group ${isDaylight ? 'bg-slate-100' : 'bg-slate-950'}`}>

      {/* Image Layer */}
      {!isVideoTab && (
        <img
          src={currentImageUrl!}
          alt={asset.name}
          onClick={onExpand}
          className="w-full h-full object-cover transition-opacity duration-300 cursor-pointer"
          title="Click to view full screen photos and video"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (img.src && img.src.includes('?')) {
              img.src = img.src.split('?')[0];
            } else {
              img.src =
                'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800';
            }
          }}
        />
      )}

      {/* Video Layer */}
      {isVideoTab && video && (
        <div className="relative w-full h-full bg-black">
          <video
            ref={videoRef}
            src={video.url}
            className="w-full h-full object-cover cursor-pointer"
            muted={isMuted}
            loop
            playsInline
            autoPlay
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onClick={togglePlay}
            onError={(e) => {
              const vid = e.target as HTMLVideoElement;
              if (vid.src && vid.src.includes('?')) {
                vid.src = vid.src.split('?')[0];
              }
            }}
          />
          {/* Play/Pause overlay */}
          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/20 transition-colors z-10 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                <Play className="h-6 w-6 fill-current ml-0.5" />
              </div>
            </button>
          )}

          {/* Video Controls Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center gap-2 z-20">
            <button
              onClick={togglePlay}
              className="p-1 rounded-md bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
            </button>
            <button
              onClick={toggleMute}
              className="p-1 rounded-md bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            {video.durationSeconds && (
              <span className="text-[10px] text-amber-300 font-mono font-bold bg-black/60 px-1.5 py-0.5 rounded ml-auto">
                {video.durationSeconds}s Demo
              </span>
            )}
          </div>
        </div>
      )}

      {/* Subtle overlay */}
      <div className={`absolute inset-0 pointer-events-none ${
        isDaylight
          ? 'bg-gradient-to-t from-slate-950/25 via-transparent to-transparent'
          : 'bg-gradient-to-t from-black/60 via-transparent to-black/10'
      }`} />

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className={`absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 backdrop-blur-md z-20 cursor-pointer shadow-md ${
              isDaylight
                ? 'bg-white/95 hover:bg-white text-slate-800 border border-slate-300 hover:scale-105'
                : 'bg-black/70 hover:bg-black/90 text-white border border-white/20 hover:scale-105'
            }`}
            title="Previous media"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={next}
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 backdrop-blur-md z-20 cursor-pointer shadow-md ${
              isDaylight
                ? 'bg-white/95 hover:bg-white text-slate-800 border border-slate-300 hover:scale-105'
                : 'bg-black/70 hover:bg-black/90 text-white border border-white/20 hover:scale-105'
            }`}
            title="Next media"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
          {slides.map((s, i) => {
            const isVid = s === 'video';
            const isActive = i === activeIdx;
            return (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isVid) {
                    playVideoInPlace();
                  } else {
                    pauseVideo();
                    setActiveIdx(i);
                  }
                }}
                className={`transition-all rounded-full flex items-center justify-center cursor-pointer ${
                  isActive
                    ? isVid
                      ? 'w-7 h-3 bg-amber-400 text-[8px] text-slate-950 font-black px-1 shadow-md'
                      : 'w-4 h-1.5 bg-amber-400 shadow-md'
                    : isVid
                      ? isDaylight
                        ? 'w-3 h-3 bg-amber-100 hover:bg-amber-300 border border-amber-400 text-amber-900'
                        : 'w-3 h-3 bg-amber-400/40 hover:bg-amber-400 border border-amber-300/80 text-white'
                      : isDaylight
                        ? 'w-1.5 h-1.5 bg-slate-400/90 hover:bg-slate-700'
                        : 'w-1.5 h-1.5 bg-white/60 hover:bg-white'
                }`}
                title={isVid ? 'Play Video Demo' : `Photo ${i + 1}`}
              >
                {isVid && <Play className="h-2 w-2 fill-current" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Media Count Badge */}
      {hasGallery && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
          {images.length > 0 && (
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md shadow-sm border ${
              isDaylight
                ? 'bg-white/95 text-slate-800 border-slate-300 shadow-slate-200'
                : 'bg-black/70 text-white border-white/20'
            }`}>
              <Images className={`h-3 w-3 ${isDaylight ? 'text-indigo-600' : 'text-slate-300'}`} />
              {images.length}
            </span>
          )}
          {video && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                playVideoInPlace();
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black backdrop-blur-md shadow-sm border transition-all cursor-pointer ${
                isDaylight
                  ? isVideoTab && isPlaying
                    ? 'bg-amber-500 text-slate-950 border-amber-600 ring-2 ring-amber-400/50'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300'
                  : isVideoTab && isPlaying
                    ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/50'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
              }`}
              title="Click to play 10s video demo in place"
            >
              <Video className="h-3 w-3 fill-current" />
              {video.durationSeconds ? `${video.durationSeconds}s` : 'Video'}
            </button>
          )}
        </div>
      )}

      {/* Expand Icon */}
      <button
        onClick={(e) => { e.stopPropagation(); onExpand(); }}
        className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center opacity-90 group-hover:opacity-100 transition-all backdrop-blur-md z-20 cursor-pointer shadow-md ${
          isDaylight
            ? 'bg-white/95 hover:bg-white text-slate-800 border border-slate-300'
            : 'bg-black/70 hover:bg-black/90 text-white border border-white/20'
        }`}
        title="Click to view full screen photos and video"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

// ─── Lightbox Modal ────────────────────────────────────────────────────────────
const LightboxModal: React.FC<{ asset: Asset; onClose: () => void }> = ({ asset, onClose }) => {
  const { isDaylight } = useTheme();
  const [activeIdx, setActiveIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const images = asset.mediaItems?.filter(m => m.mediaType === 'IMAGE') ?? [];
  const video  = asset.mediaItems?.find(m => m.mediaType === 'VIDEO');
  const slides: Array<AssetMedia | 'video'> = [...images, ...(video ? ['video' as const] : [])];

  const isVideoTab = slides[activeIdx] === 'video';
  const currentUrl = isVideoTab ? null : (slides[activeIdx] as AssetMedia)?.url ?? asset.imageUrl;

  const go = (dir: number) => {
    videoRef.current?.pause();
    setIsPlaying(false);
    setActiveIdx(i => (i + dir + slides.length) % slides.length);
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white z-10">
        <X className="h-7 w-7" />
      </button>

      <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
        {/* Main Media */}
        <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video">
          {!isVideoTab && (
            <img
              src={currentUrl!}
              alt={asset.name}
              className="w-full h-full object-contain"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.src && img.src.includes('?')) {
                  img.src = img.src.split('?')[0];
                }
              }}
            />
          )}
          {isVideoTab && video && (
            <video
              ref={videoRef}
              src={video.url}
              className="w-full h-full object-contain"
              controls
              autoPlay
              onError={(e) => {
                const vid = e.target as HTMLVideoElement;
                if (vid.src && vid.src.includes('?')) {
                  vid.src = vid.src.split('?')[0];
                }
              }}
            />
          )}

          {slides.length > 1 && (
            <>
              <button onClick={() => go(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 flex items-center justify-center text-white">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={() => go(1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 flex items-center justify-center text-white">
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Strip */}
        {slides.length > 1 && (
          <div className="flex gap-2 mt-3 justify-center">
            {slides.map((s, i) => (
              <button
                key={i}
                onClick={() => { videoRef.current?.pause(); setActiveIdx(i); }}
                className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  i === activeIdx ? 'border-amber-400 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                {s === 'video' ? (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                    <Play className="h-5 w-5 text-amber-400" />
                  </div>
                ) : (
                  <img src={(s as AssetMedia).url} alt="" className="w-full h-full object-cover" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Asset name */}
        <div className="text-center mt-3">
          <p className="text-white font-bold">{asset.name}</p>
          <p className="text-slate-400 text-sm font-mono">{asset.assetTag}</p>
        </div>
      </div>
    </div>
  );
};

// ─── Machine Card ──────────────────────────────────────────────────────────────
const MachineCard: React.FC<{
  asset: Asset;
  onBook: () => void;
  onExpand: () => void;
}> = ({ asset, onBook, onExpand }) => {
  const { isDaylight } = useTheme();
  const isAvail = asset.status === 'AVAILABLE';

  return (
    <div
      className={`rounded-2xl overflow-hidden border flex flex-col transition-all hover:shadow-xl hover:-translate-y-0.5 duration-200 ${
        isDaylight
          ? 'border-slate-200 bg-white shadow-sm hover:shadow-slate-200'
          : 'border-slate-800 bg-slate-900 hover:border-slate-700 hover:shadow-slate-900/80'
      }`}
    >
      {/* Media Carousel */}
      <MediaCarousel asset={asset} onExpand={onExpand} />

      {/* Card Content */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Title Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border font-bold ${
                isDaylight
                  ? 'text-amber-900 bg-amber-50 border-amber-200'
                  : 'text-amber-400 bg-amber-900/20 border-amber-700/40'
              }`}>
                {asset.assetTag}
              </span>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                asset.category === 'AGRICULTURE'
                  ? isDaylight ? 'bg-green-100 text-green-800' : 'bg-green-900/30 text-green-400'
                  : isDaylight ? 'bg-blue-100 text-blue-800' : 'bg-blue-900/30 text-blue-400'
              }`}>
                {asset.category === 'AGRICULTURE' ? 'Agro' : 'Civil'}
              </span>
            </div>
            <h3 className={`font-black text-sm mt-1 leading-tight ${isDaylight ? 'text-slate-900' : 'text-white'}`}>
              {asset.name}
            </h3>
          </div>
          <StatusBadge status={asset.status} size="sm" />
        </div>

        {/* Specs Row */}
        <div className={`grid grid-cols-2 gap-2 text-[11px] ${isDaylight ? 'text-slate-600' : 'text-slate-400'}`}>
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">{asset.manufacturerName || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 shrink-0 text-slate-400" />
            <span>{asset.engineHours}h run</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <MapPin className="h-3 w-3 shrink-0 text-emerald-500" />
            <span className="truncate font-medium">
              {asset.hubName || 'Hardoi Central Yard'}
              {asset.cityName && <span className={isDaylight ? 'text-slate-400' : 'text-slate-500'}>, {asset.cityName}</span>}
            </span>
          </div>
          {asset.operatorRequired && (
            <div className="flex items-center gap-1.5 col-span-2">
              <UserCheck className="h-3 w-3 shrink-0 text-amber-500" />
              <span className={isDaylight ? 'text-amber-800 font-bold' : 'text-amber-400 font-semibold'}>Operator Mandatory</span>
            </div>
          )}
          {/* Shift Allowance (In short) */}
          <div className="flex items-center gap-1.5 col-span-2 text-[11px] font-semibold rounded-lg px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
            <Clock className="h-3 w-3 shrink-0 text-amber-500" />
            <span>Std: 8 hrs/day (+1h buffer) • Extra hrs extra</span>
          </div>
        </div>

        {/* Pricing */}
        <div className={`rounded-xl p-3 mt-auto ${isDaylight ? 'bg-slate-50 border border-slate-100' : 'bg-slate-800/60 border border-slate-700/40'}`}>
          <div className="flex items-end justify-between">
            <div>
              <div className={`text-xl font-black ${isDaylight ? 'text-slate-900' : 'text-white'}`}>
                {formatINR(asset.dailyRate)}
                <span className={`text-xs font-normal ml-1 ${isDaylight ? 'text-slate-500' : 'text-slate-400'}`}>/day</span>
              </div>
              <div className={`text-[11px] mt-0.5 ${isDaylight ? 'text-amber-700 font-semibold' : 'text-slate-400'}`}>
                Deposit: {formatINR(asset.depositAmount)}
              </div>
            </div>
            <button
              onClick={onBook}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isAvail
                  ? isDaylight
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm shadow-amber-200'
                    : 'bg-amber-500 hover:bg-amber-400 text-black'
                  : isDaylight
                  ? 'bg-slate-200 text-slate-500 cursor-default'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-default'
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              {isAvail ? 'Book Now' : 'Unavailable'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main View ─────────────────────────────────────────────────────────────────
export const EquipmentCatalogView: React.FC<EquipmentCatalogViewProps> = ({ onSelectForBooking }) => {
  const { isDaylight } = useTheme();
  const { currentUser } = useAuth();
  const isGuest = currentUser?.role === 'guest';
  const [assetsList, setAssetsList] = useState<Asset[]>([...api.assets]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [lightboxAsset, setLightboxAsset] = useState<Asset | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  React.useEffect(() => {
    setAssetsList([...api.assets]);
    return api.subscribe(() => {
      setAssetsList([...api.assets]);
    });
  }, []);

  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean; variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string;
  }>({ isOpen: false, variant: 'success', title: '', message: '' });

  const showFeedback = (variant: 'success' | 'error' | 'warning' | 'info', title: string, message: string) =>
    setFeedbackModal({ isOpen: true, variant, title, message });

  const states = api.getStates();
  const cities = api.getCities();
  const hubs   = api.getHubs();

  const [selectedStateId, setSelectedStateId] = useState<string>('ALL');
  const [selectedCityId,  setSelectedCityId]  = useState<string>('ALL');
  const [selectedHubId,   setSelectedHubId]   = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter,    setStatusFilter]    = useState<string>('ALL');
  const [searchQuery,     setSearchQuery]     = useState('');

  const [visibleCount, setVisibleCount] = useState<number>(7);

  const availableCities = useMemo(() => {
    if (selectedStateId === 'ALL') return cities;
    return cities.filter(c => c.stateId === Number(selectedStateId));
  }, [cities, selectedStateId]);

  const availableHubs = useMemo(() => {
    if (selectedCityId !== 'ALL') return hubs.filter(h => h.cityId === Number(selectedCityId));
    if (selectedStateId !== 'ALL') {
      const cityIds = new Set(availableCities.map(c => c.id));
      return hubs.filter(h => cityIds.has(h.cityId));
    }
    return hubs;
  }, [hubs, selectedCityId, selectedStateId, availableCities]);

  const handleStateChange = (val: string | number) => { setSelectedStateId(String(val)); setSelectedCityId('ALL'); setSelectedHubId('ALL'); };
  const handleCityChange  = (val: string | number) => { setSelectedCityId(String(val)); setSelectedHubId('ALL'); };
  const handleResetFilters = () => { setSelectedStateId('ALL'); setSelectedCityId('ALL'); setSelectedHubId('ALL'); setSelectedCategory('ALL'); setStatusFilter('ALL'); setSearchQuery(''); };

  const filteredAssets = useMemo(() => {
    return assetsList.filter(asset => {
      const assetHub    = hubs.find(h => h.id === asset.hubId);
      const assetCity   = cities.find(c => c.id === assetHub?.cityId);
      const assetStateId = assetCity?.stateId;

      if (selectedStateId !== 'ALL' && assetStateId !== Number(selectedStateId)) return false;
      if (selectedCityId  !== 'ALL' && assetHub?.cityId !== Number(selectedCityId)) return false;
      if (selectedHubId   !== 'ALL' && asset.hubId !== Number(selectedHubId)) return false;
      if (selectedCategory !== 'ALL' && asset.category !== selectedCategory) return false;
      if (statusFilter    !== 'ALL' && asset.status !== statusFilter) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        if (![asset.name, asset.assetTag, asset.modelName, asset.manufacturerName, asset.hubName].some(s => s?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [assetsList, hubs, cities, selectedStateId, selectedCityId, selectedHubId, selectedCategory, statusFilter, searchQuery]);

  // Reset to initial 7 items when filters change
  React.useEffect(() => {
    setVisibleCount(7);
  }, [selectedStateId, selectedCityId, selectedHubId, selectedCategory, statusFilter, searchQuery]);

  // Infinite scroll slice (default 7, loads +7 on scroll)
  const visibleAssets = useMemo(() => {
    return filteredAssets.slice(0, visibleCount);
  }, [filteredAssets, visibleCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 60) {
      if (visibleCount < filteredAssets.length) {
        setVisibleCount(prev => Math.min(prev + 7, filteredAssets.length));
      }
    }
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => Math.min(prev + 7, filteredAssets.length));
  };

  const handleMachineAdded = (newAsset: Asset) => {
    setAssetsList([...api.assets]);
    showFeedback('success', 'Machine Added', `"${newAsset.name}" registered in fleet.`);
  };

  const statsAvailable = filteredAssets.filter(a => a.status === 'AVAILABLE').length;
  const statsOnRent    = filteredAssets.filter(a => a.status === 'ON_RENT').length;

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-2">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className={`text-lg sm:text-xl font-black flex items-center gap-2 ${isDaylight ? 'text-slate-950' : 'text-white'}`}>
            <Truck className={`h-5 w-5 ${isDaylight ? 'text-amber-700' : 'text-slate-400'}`} />
            Fleet &amp; Machinery
          </h2>
          <p className={`text-[11px] mt-0.5 ${isDaylight ? 'text-slate-500' : 'text-slate-400'}`}>
            {filteredAssets.length} machines · {statsAvailable} available · {statsOnRent} on rent
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className={`flex rounded-lg border p-0.5 ${isDaylight ? 'border-slate-300 bg-slate-100' : 'border-slate-700 bg-slate-800'}`}>
            {(['grid', 'list'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  viewMode === mode
                    ? isDaylight ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-700 text-white'
                    : isDaylight ? 'text-slate-500' : 'text-slate-500'
                }`}
              >
                {mode === 'grid' ? '⊞ Grid' : '☰ List'}
              </button>
            ))}
          </div>

          {!isGuest && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isDaylight
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Add Machine
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className={`flex-shrink-0 p-2.5 rounded-xl border ${isDaylight ? 'border-slate-300 bg-slate-50/60' : 'border-slate-800 bg-slate-900/40'}`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[10px] font-black uppercase tracking-wider ${isDaylight ? 'text-slate-400' : 'text-slate-500'}`}>Filters</span>
          <button onClick={handleResetFilters} className={`text-[11px] flex items-center gap-1 font-bold ${isDaylight ? 'text-amber-800 hover:text-amber-950' : 'text-slate-400 hover:text-slate-200'}`}>
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <SearchSelect options={[{ value: 'ALL', label: 'All States' }, ...states.map(s => ({ value: String(s.id), label: s.name }))]} value={selectedStateId} onChange={v => handleStateChange(v || 'ALL')} placeholder="All States" isClearable={false} />
          <SearchSelect options={[{ value: 'ALL', label: 'All Cities' }, ...availableCities.map(c => ({ value: String(c.id), label: c.name }))]} value={selectedCityId} onChange={v => handleCityChange(v || 'ALL')} placeholder="All Cities" isClearable={false} />
          <SearchSelect options={[{ value: 'ALL', label: 'All Hubs' }, ...availableHubs.map(h => ({ value: String(h.id), label: h.name }))]} value={selectedHubId} onChange={v => setSelectedHubId(String(v || 'ALL'))} placeholder="All Hubs" isClearable={false} />
          <SearchSelect options={[{ value: 'ALL', label: 'All Categories' }, { value: 'CONSTRUCTION', label: 'Civil Construction' }, { value: 'AGRICULTURE', label: 'Agro-Mechanization' }]} value={selectedCategory} onChange={v => setSelectedCategory(String(v || 'ALL'))} placeholder="Category" isClearable={false} />
          <SearchSelect options={[{ value: 'ALL', label: 'All Statuses' }, { value: 'AVAILABLE', label: 'Available' }, { value: 'ON_RENT', label: 'On Rent' }, { value: 'MAINTENANCE', label: 'Maintenance' }]} value={statusFilter} onChange={v => setStatusFilter(String(v || 'ALL'))} placeholder="Status" isClearable={false} />
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search…"
              className={`w-full rounded-lg border pl-8 pr-2.5 py-1.5 text-xs focus:outline-none transition-colors ${isDaylight ? 'border-slate-300 bg-white text-slate-950 placeholder-slate-400 focus:border-amber-500' : 'border-slate-700 bg-slate-950 text-white placeholder-slate-600 focus:border-amber-500'}`}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredAssets.length === 0 ? (
        <div className={`flex-1 min-h-0 rounded-2xl border p-12 text-center flex flex-col items-center justify-center ${isDaylight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-900/30'}`}>
          <Truck className="h-10 w-10 mx-auto opacity-20 mb-2" />
          <p className="font-bold text-sm text-slate-500">No machinery matches your filters</p>
          <button onClick={handleResetFilters} className="mt-2 text-xs text-amber-600 hover:text-amber-500 font-semibold">Clear filters</button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View — scrolls within section dynamically */
        <div
          className={`flex-1 min-h-0 rounded-2xl border overflow-hidden flex flex-col ${
            isDaylight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900/40'
          }`}
        >
          <div
            onScroll={handleScroll}
            className="flex-1 min-h-0 p-3 overflow-y-auto"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5">
              {visibleAssets.map(asset => (
                <MachineCard
                  key={asset.id}
                  asset={asset}
                  onBook={() => onSelectForBooking(asset)}
                  onExpand={() => setLightboxAsset(asset)}
                />
              ))}
            </div>
          </div>
          <InfiniteScrollFooter
            loadedCount={visibleAssets.length}
            totalCount={filteredAssets.length}
            onLoadMore={handleLoadMore}
            itemName="machinery units"
          />
        </div>
      ) : (
        /* List View — compact table scrolling dynamically within section */
        <div className={`flex-1 min-h-0 rounded-2xl border overflow-hidden flex flex-col ${isDaylight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'}`}>
          <div
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-x-auto overflow-y-auto"
          >
            <table className="w-full text-left text-xs">
              <thead className={`sticky top-0 z-10 border-b text-[10px] font-black uppercase tracking-wider ${isDaylight ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-slate-800 bg-slate-950 text-slate-300'}`}>
                <tr>
                  <th className="py-3 px-4">Machine</th>
                  <th className="py-3 px-4">Model</th>
                  <th className="py-3 px-4">Hub</th>
                  <th className="py-3 px-4">Rate / Deposit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDaylight ? 'divide-slate-100' : 'divide-slate-800/50'}`}>
                {visibleAssets.map(asset => {
                  const isAvail = asset.status === 'AVAILABLE';
                  const thumb = asset.mediaItems?.find(m => m.mediaType === 'IMAGE')?.url ?? asset.imageUrl;
                  const hasVideo = asset.mediaItems?.some(m => m.mediaType === 'VIDEO');
                  return (
                    <tr key={asset.id} className={`transition-colors ${isDaylight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/30'}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-16 rounded-lg overflow-hidden bg-slate-900 shrink-0 cursor-pointer" onClick={() => setLightboxAsset(asset)}>
                            <img
                              src={thumb}
                              alt={asset.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                if (img.src && img.src.includes('?')) {
                                  img.src = img.src.split('?')[0];
                                } else {
                                  img.src =
                                    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800';
                                }
                              }}
                            />
                            {hasVideo && <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center"><Play className="h-2 w-2 text-white" /></div>}
                            {(asset.mediaItems?.filter(m => m.mediaType === 'IMAGE').length ?? 0) > 1 && (
                              <div className="absolute top-0.5 right-0.5 bg-black/70 rounded px-1 text-[8px] text-white font-bold">
                                +{asset.mediaItems!.filter(m => m.mediaType === 'IMAGE').length}
                              </div>
                            )}
                          </div>
                          <div>
                            <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border font-bold ${isDaylight ? 'text-amber-900 bg-amber-50 border-amber-200' : 'text-amber-400 bg-amber-900/20 border-amber-700/40'}`}>{asset.assetTag}</span>
                            <div className={`font-extrabold text-sm mt-0.5 ${isDaylight ? 'text-slate-900' : 'text-white'}`}>{asset.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold">{asset.modelName}</div>
                        <div className="text-slate-500 text-[11px] flex items-center gap-1"><Building2 className="h-3 w-3" />{asset.manufacturerName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 font-semibold"><MapPin className="h-3 w-3 text-emerald-500" />{asset.hubName}</div>
                        <div className="text-slate-500 text-[10px] ml-4">{asset.cityName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className={`font-black ${isDaylight ? 'text-slate-900' : 'text-white'}`}>{formatINR(asset.dailyRate)}<span className="text-[10px] font-normal text-slate-500">/day</span></div>
                        <div className={`text-[11px] ${isDaylight ? 'text-amber-700 font-semibold' : 'text-slate-400'}`}>Dep: {formatINR(asset.depositAmount)}</div>
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Std: 8h/day (+1h buffer) • Extra billed</div>
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={asset.status} size="sm" /></td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => onSelectForBooking(asset)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${isAvail ? isDaylight ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm' : 'bg-amber-500 hover:bg-amber-400 text-black' : isDaylight ? 'bg-slate-200 text-slate-500' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                          <Zap className="h-3.5 w-3.5" />{isAvail ? 'Book' : 'Unavailable'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Infinite Scroll Footer */}
          <InfiniteScrollFooter
            loadedCount={visibleAssets.length}
            totalCount={filteredAssets.length}
            onLoadMore={handleLoadMore}
            itemName="machinery units"
          />
        </div>
      )}

      {/* Lightbox */}
      {lightboxAsset && <LightboxModal asset={lightboxAsset} onClose={() => setLightboxAsset(null)} />}

      {/* Add Machine Modal */}
      <AddMachineModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onMachineAdded={handleMachineAdded} />

      {/* Feedback Modal */}
      <ConfirmationModal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal(p => ({ ...p, isOpen: false }))}
        variant={feedbackModal.variant}
        title={feedbackModal.title}
        message={feedbackModal.message}
      />
    </div>
  );
};
