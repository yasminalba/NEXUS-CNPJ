import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Search,
  Navigation,
  Phone,
  Globe,
  Building2,
  ExternalLink,
  AlertCircle,
  LocateFixed,
  SlidersHorizontal,
} from 'lucide-react';
import { formatCnpj } from '../utils/cnpj.ts';

interface PlaceResultItem {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  website: string;
  lat: number;
  lng: number;
  distanceKm: number;
  matchedCnpj?: string | null;
  matchedSituacao?: string | null;
  matchedPorte?: string | null;
}

const QUICK_CATEGORIES = [
  { label: 'Hospitais', query: 'hospitais' },
  { label: 'Clínicas', query: 'clínicas médicas' },
  { label: 'Farmácias', query: 'farmácias' },
  { label: 'Restaurantes', query: 'restaurantes' },
  { label: 'Escolas', query: 'escolas e colégios' },
  { label: 'Bancos', query: 'agências bancárias bancos' },
  { label: 'Supermercados', query: 'supermercados' },
  { label: 'Hotéis', query: 'hotéis' },
  { label: 'Oficinas', query: 'oficinas mecânicas' },
  { label: 'Empresas', query: 'empresas escritórios corporativos' },
];

const DISTANCE_OPTIONS = [
  { label: '1 km', value: 1 },
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
  { label: '50 km', value: 50 },
];

// Cálculo de distância aproximada (Haversine em km)
function computeHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const MapaPage: React.FC = () => {
  const navigate = useNavigate();
  const placesLib = useMapsLibrary('places');

  // Centro inicial padrão (Av. Paulista, São Paulo - SP) caso o usuário ainda não tenha compartilhado localização
  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: -23.561414,
    lng: -46.655881,
  });
  const [locationStatus, setLocationStatus] = useState<
    'prompt' | 'granted' | 'denied' | 'manual'
  >('prompt');
  const [manualLocationInput, setManualLocationInput] = useState('São Paulo, SP');

  // Pesquisa de estabelecimentos e filtros
  const [searchQuery, setSearchQuery] = useState('Hospitais');
  const [activeCategory, setActiveCategory] = useState('Hospitais');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(25);
  const [sortBy, setSortBy] = useState<'distance' | 'az' | 'za'>('distance');
  const [situacaoFilter, setSituacaoFilter] = useState<string>('TODAS');
  const [porteFilter, setPorteFilter] = useState<string>('TODOS');

  const [results, setResults] = useState<PlaceResultItem[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cnpjLookupNotice, setCnpjLookupNotice] = useState<Record<string, string>>({});

  // Executa busca real via Places API (New) — Place.searchByText
  const executePlacesSearch = useCallback(
    async (
      queryText: string,
      targetCenter: { lat: number; lng: number },
      radiusKm: number
    ) => {
      if (!placesLib) return;
      const trimmed = queryText.trim();
      if (!trimmed) return;

      setLoading(true);
      setError(null);

      try {
        const radiusMeters = Math.min(radiusKm * 1000, 50000);
        const { places } = await placesLib.Place.searchByText({
          textQuery: trimmed,
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'primaryTypeDisplayName',
            'nationalPhoneNumber',
            'websiteURI',
          ],
          locationBias: {
            center: targetCenter,
            radius: radiusMeters,
          },
          maxResultCount: 18,
        });

        const mapped: PlaceResultItem[] = (places || [])
          .filter((p: any) => p && p.location)
          .map((p: any) => {
            const lat =
              typeof p.location!.lat === 'function'
                ? p.location!.lat()
                : (p.location as any).lat;
            const lng =
              typeof p.location!.lng === 'function'
                ? p.location!.lng()
                : (p.location as any).lng;
            const dist = computeHaversineKm(targetCenter.lat, targetCenter.lng, lat, lng);

            // Reconhece alguns estabelecimentos reais conhecidos sem jamais inventar CNPJ
            const displayName = p.displayName || 'Estabelecimento';
            const upperName = displayName.toUpperCase();
            let knownCnpj: string | null = null;
            let knownSituacao: string | null = null;
            let knownPorte: string | null = null;

            if (upperName.includes('ALBERT EINSTEIN')) {
              knownCnpj = '60765823000130';
              knownSituacao = 'ATIVA';
              knownPorte = 'DEMAIS';
            } else if (upperName.includes('BANCO DO BRASIL')) {
              knownCnpj = '00000000000191';
              knownSituacao = 'ATIVA';
              knownPorte = 'DEMAIS';
            } else if (upperName.includes('PETROBRAS')) {
              knownCnpj = '33000167000101';
              knownSituacao = 'ATIVA';
              knownPorte = 'DEMAIS';
            } else if (upperName.includes('MAGAZINE LUIZA') || upperName.includes('MAGALU')) {
              knownCnpj = '47960950000121';
              knownSituacao = 'ATIVA';
              knownPorte = 'DEMAIS';
            }

            return {
              id: p.id || `${lat}-${lng}`,
              name: displayName,
              category: (p as any).primaryTypeDisplayName || activeCategory || 'Estabelecimento',
              address: p.formattedAddress || 'Endereço não informado',
              phone: p.nationalPhoneNumber || '',
              website: p.websiteURI || '',
              lat,
              lng,
              distanceKm: dist,
              matchedCnpj: knownCnpj,
              matchedSituacao: knownSituacao,
              matchedPorte: knownPorte,
            };
          });

        setResults(mapped);
        if (mapped.length > 0) {
          setSelectedPlaceId(mapped[0].id);
        } else {
          setSelectedPlaceId(null);
        }
      } catch (err: any) {
        const msg = String(err?.message || err || '');
        if (
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('OVER_QUERY_LIMIT') ||
          msg.includes('429')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setError('Não foi possível carregar os dados de estabelecimentos no momento.');
      } finally {
        setLoading(false);
      }
    },
    [placesLib, activeCategory]
  );

  // Carrega busca inicial quando a biblioteca Places estiver pronta
  useEffect(() => {
    if (placesLib) {
      executePlacesSearch(searchQuery, center, maxDistanceKm);
    }
  }, [placesLib]); // eslint-disable-line react-hooks/exhaustive-deps

  // Solicitação transparente de geolocalização do navegador
  const handleRequestBrowserLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCenter(userCoords);
        setLocationStatus('granted');
        executePlacesSearch(searchQuery, userCoords, maxDistanceKm);
      },
      () => {
        setLocationStatus('denied');
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  // Busca manual por Cidade, Bairro, CEP ou Endereço
  const handleManualLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placesLib || !manualLocationInput.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const { places } = await placesLib.Place.searchByText({
        textQuery: `${manualLocationInput.trim()}, Brasil`,
        fields: ['id', 'displayName', 'location', 'formattedAddress'],
        maxResultCount: 1,
      });

      const first = places?.[0];
      if (first?.location) {
        const lat =
          typeof first.location.lat === 'function'
            ? first.location.lat()
            : (first.location as any).lat;
        const lng =
          typeof first.location.lng === 'function'
            ? first.location.lng()
            : (first.location as any).lng;
        const newCenter = { lat, lng };
        setCenter(newCenter);
        setLocationStatus('manual');
        await executePlacesSearch(searchQuery, newCenter, maxDistanceKm);
      } else {
        setError('Localização manual não encontrada. Tente informar Cidade e UF ou CEP.');
      }
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('OVER_QUERY_LIMIT') || msg.includes('429')) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      setError('Erro ao localizar endereço informado.');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (cat: { label: string; query: string }) => {
    setActiveCategory(cat.label);
    setSearchQuery(cat.query);
    executePlacesSearch(cat.query, center, maxDistanceKm);
  };

  const handleSearchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executePlacesSearch(searchQuery, center, maxDistanceKm);
  };

  // Tenta identificar o CNPJ em nossa base confiável; se não houver, exibe aviso sem inventar CNPJ
  const handleCheckPlaceCnpj = async (item: PlaceResultItem) => {
    if (item.matchedCnpj) {
      navigate(`/empresa/${item.matchedCnpj}`);
      return;
    }

    try {
      const res = await fetch(`/api/companies/match?name=${encodeURIComponent(item.name)}`);
      const data = await res.json();
      if (data?.found && data?.company?.cnpj) {
        navigate(`/empresa/${data.company.cnpj}`);
      } else {
        setCnpjLookupNotice((prev) => ({
          ...prev,
          [item.id]: 'CNPJ não disponível para este estabelecimento.',
        }));
      }
    } catch {
      setCnpjLookupNotice((prev) => ({
        ...prev,
        [item.id]: 'CNPJ não disponível para este estabelecimento.',
      }));
    }
  };

  // Filtra e ordena os resultados conforme Distância, Situação, Porte e Ordenação
  const filteredAndSortedResults = useMemo(() => {
    const filtered = results.filter((item) => {
      if (item.distanceKm > maxDistanceKm) return false;
      if (situacaoFilter !== 'TODAS' && item.matchedSituacao !== situacaoFilter) {
        return false;
      }
      if (porteFilter !== 'TODOS' && item.matchedPorte !== porteFilter) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'distance') return a.distanceKm - b.distanceKm;
      if (sortBy === 'az') return a.name.localeCompare(b.name, 'pt-BR');
      if (sortBy === 'za') return b.name.localeCompare(a.name, 'pt-BR');
      return 0;
    });
  }, [results, maxDistanceKm, situacaoFilter, porteFilter, sortBy]);

  const selectedPlace = useMemo(
    () => filteredAndSortedResults.find((p) => p.id === selectedPlaceId) || null,
    [filteredAndSortedResults, selectedPlaceId]
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Aviso de Privacidade e Localização (Seção 9 e 37) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <LocateFixed className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Precisamos da sua localização para encontrar estabelecimentos próximos.</span>
          </div>
          <p className="text-xs text-slate-600">
            O compartilhamento é opcional e sua localização exata não é armazenada. Você também pode
            pesquisar manualmente por cidade, bairro, CEP ou endereço.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRequestBrowserLocation}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <LocateFixed className="w-3.5 h-3.5" />
            <span>Usar minha localização atual</span>
          </button>

          <form onSubmit={handleManualLocationSearch} className="flex items-center gap-2">
            <input
              type="text"
              value={manualLocationInput}
              onChange={(e) => setManualLocationInput(e.target.value)}
              placeholder="Cidade, bairro, CEP ou endereço..."
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 w-52 sm:w-64"
            />
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              Definir local
            </button>
          </form>
        </div>
      </div>

      {/* Barra de Pesquisa de Estabelecimentos, Categorias Rápidas e Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
        <form onSubmit={handleSearchFormSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por hospitais, clínicas, farmácias, bancos, supermercados, empresas..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
          >
            {loading ? 'Pesquisando...' : 'Pesquisar Estabelecimentos'}
          </button>
        </form>

        {/* Categorias Rápidas (Botões Interativos) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {QUICK_CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              type="button"
              onClick={() => handleCategorySelect(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeCategory === cat.label
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Filtros de Distância, Ordenação, Situação e Porte (Seção 13) */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Distância máxima:
            </span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {DISTANCE_OPTIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setMaxDistanceKm(d.value)}
                  className={`px-2.5 py-1 rounded-md font-mono transition-colors whitespace-nowrap ${
                    maxDistanceKm === d.value
                      ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label className="text-slate-600 font-medium">Situação:</label>
              <select
                value={situacaoFilter}
                onChange={(e) => setSituacaoFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800"
              >
                <option value="TODAS">Todas</option>
                <option value="ATIVA">Ativa (com CNPJ vinculado)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-slate-600 font-medium">Porte:</label>
              <select
                value={porteFilter}
                onChange={(e) => setPorteFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800"
              >
                <option value="TODOS">Todos</option>
                <option value="DEMAIS">Demais / Grande Porte</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-slate-600 font-medium">Ordenar:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800"
              >
                <option value="distance">Mais próximos</option>
                <option value="az">A-Z</option>
                <option value="za">Z-A</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Layout Dividido: ESQUERDA Lista de Estabelecimentos | DIREITA Mapa (Seção 11) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ESQUERDA: Lista de estabelecimentos */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-[620px]">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">
              Estabelecimentos encontrados ({filteredAndSortedResults.length})
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Raio: até {maxDistanceKm} km
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Carregando...</div>
            ) : filteredAndSortedResults.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-800">
                  Nenhum resultado encontrado.
                </p>
                <p className="text-xs text-slate-500">
                  Tente ampliar o filtro de distância (ex: 25 km ou 50 km) ou pesquisar outra
                  categoria.
                </p>
              </div>
            ) : (
              filteredAndSortedResults.map((place) => {
                const isSelected = place.id === selectedPlaceId;
                const routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                  place.address
                )}`;

                return (
                  <div
                    key={place.id}
                    onClick={() => setSelectedPlaceId(place.id)}
                    className={`p-4 cursor-pointer transition-colors space-y-2.5 ${
                      isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                          {place.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {place.category} ·{' '}
                          <span className="font-mono font-medium text-slate-700">
                            {place.distanceKm.toFixed(1)} km
                          </span>
                        </p>
                      </div>
                      {place.matchedCnpj && (
                        <span className="text-[11px] font-mono text-emerald-700 shrink-0">
                          CNPJ Identificado
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{place.address}</p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      {place.phone && (
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {place.phone}
                        </span>
                      )}
                      {place.website && (
                        <a
                          href={place.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <Globe className="w-3 h-3" />
                          Website
                        </a>
                      )}
                    </div>

                    {cnpjLookupNotice[place.id] && (
                      <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                        {cnpjLookupNotice[place.id]}
                      </div>
                    )}

                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlaceId(place.id);
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Ver detalhes
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckPlaceCnpj(place);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>
                          {place.matchedCnpj
                            ? `Consultar CNPJ (${formatCnpj(place.matchedCnpj)})`
                            : 'Consultar CNPJ'}
                        </span>
                      </button>

                      <a
                        href={routeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>Ver rota</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* DIREITA: Mapa Google Maps Platform */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden h-[620px] relative">
          <Map
            center={selectedPlace ? { lat: selectedPlace.lat, lng: selectedPlace.lng } : center}
            defaultZoom={13}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Marcador de referência da busca atual */}
            <AdvancedMarker position={center} title="Ponto de referência da pesquisa">
              <Pin background="#0f172a" borderColor="#0f172a" glyphColor="#ffffff" scale={0.9} />
            </AdvancedMarker>

            {/* Marcadores dos estabelecimentos encontrados */}
            {filteredAndSortedResults.map((place) => {
              const isSelected = place.id === selectedPlaceId;
              return (
                <AdvancedMarker
                  key={place.id}
                  position={{ lat: place.lat, lng: place.lng }}
                  title={place.name}
                  onClick={() => setSelectedPlaceId(place.id)}
                >
                  <Pin
                    background={isSelected ? '#2563eb' : '#dc2626'}
                    borderColor={isSelected ? '#1e3a8a' : '#991b1b'}
                    glyphColor="#ffffff"
                    scale={isSelected ? 1.25 : 1.0}
                  />
                </AdvancedMarker>
              );
            })}

            {/* InfoWindow para o estabelecimento selecionado */}
            {selectedPlace && (
              <InfoWindow
                position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
                maxWidth={280}
                onCloseClick={() => setSelectedPlaceId(null)}
              >
                <div className="space-y-2 p-1 text-slate-900">
                  <p className="text-xs font-bold leading-snug">{selectedPlace.name}</p>
                  <p className="text-[11px] text-slate-600">{selectedPlace.address}</p>
                  <p className="text-[11px] font-mono text-slate-500">
                    Distância aprox.: {selectedPlace.distanceKm.toFixed(1)} km
                  </p>
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCheckPlaceCnpj(selectedPlace)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-white bg-blue-600 rounded hover:bg-blue-700"
                    >
                      Consultar CNPJ
                    </button>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                        selectedPlace.address
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      <span>Ver rota</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </div>
      </div>
    </div>
  );
};
