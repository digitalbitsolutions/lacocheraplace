(() => {
  const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const coordinates = (lat, lng) => lat !== '' && lng !== '' && lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180;
  const distance = (a, b) => {
    const rad = (n) => n * Math.PI / 180;
    const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
  };
  function filterProviders(providers, location, radius) {
    return providers.flatMap((provider) => {
      const address = normalize(provider.address);
      if (!/(^|,\s*)(peru|pe)\s*$/.test(address) && !['peru', 'pe'].includes(normalize(provider.country))) return [];
      if (location.mode === 'city') {
        const cities = provider.city ? [normalize(provider.city)] : address.split(',').map((part) => part.trim().replace(/\s+\d{5}$/, ''));
        return cities.includes(normalize(location.city)) ? [{ ...provider, distanceKm: null }] : [];
      }
      if (!coordinates(provider.latitude, provider.longitude)) return [];
      const distanceKm = distance(location, provider);
      return distanceKm <= radius ? [{ ...provider, distanceKm }] : [];
    }).sort((a, b) => location.mode === 'city' ? a.name.localeCompare(b.name, 'es') : a.distanceKm - b.distanceKm);
  }
  // Pure functions are also exercised by the Node regression tests.
  if (typeof module !== 'undefined' && module.exports) module.exports = { filterProviders, coordinates, distance };
  if (typeof window === 'undefined' || customElements.get('home-location-search')) return;
  let mapsPromise;
  function loadPlaces(key) {
    if (window.google?.maps?.importLibrary) return window.google.maps.importLibrary('places');
    if (!mapsPromise) mapsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timeout = setTimeout(() => reject(new Error('Google no responde. Inténtalo de nuevo.')), 15000);
      window.lcpPlacesReady = () => { clearTimeout(timeout); resolve(window.google.maps.importLibrary('places')); };
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&libraries=places&v=weekly&language=es&region=PE&callback=lcpPlacesReady`;
      script.async = true;
      script.onerror = () => { clearTimeout(timeout); reject(new Error('No se pudieron cargar las sugerencias de Google.')); };
      document.head.append(script);
    }).catch((error) => { mapsPromise = null; throw error; });
    return mapsPromise;
  }
  customElements.define('home-location-search', class extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.mode = this.querySelector('[data-location-mode]');
      this.city = this.querySelector('[data-city]');
      this.mode.addEventListener('change', () => this.updateMode());
      this.city.addEventListener('input', () => this.clearResults());
      this.closest('form').addEventListener('input', () => this.clearResults());
      this.closest('form').addEventListener('click', (event) => {
        if (event.target.closest('[data-service-value]')) this.clearResults();
      });
      this.updateMode();
    }
    clearResults() {
      const results = document.getElementById(this.closest('form').dataset.resultsId);
      if (results) results.hidden = true;
      this.revision = (this.revision || 0) + 1;
    }
    updateMode() {
      this.clearResults();
      this.querySelector('[data-city-field]').hidden = this.mode.value !== 'city';
      this.querySelector('[data-address-field]').hidden = this.mode.value !== 'address';
      this.closest('form').querySelector('.home-hero-service-search__distance-wrap').hidden = this.mode.value === 'city';
      this.querySelector('[data-location-help]').textContent = this.mode.value === 'city' ? 'Mostraremos los proveedores de la ciudad elegida.' : 'Mostraremos proveedores dentro del radio elegido, ordenados por distancia en línea recta.';
      if (this.mode.value === 'address') this.initAddress();
    }
    async initAddress() {
      if (this.widget || this.loading) return;
      const status = this.querySelector('[data-address-status]');
      this.loading = true;
      status.textContent = 'Cargando sugerencias de Google…';
      try {
        let key = this.dataset.googleKey;
        if (!key) {
          const response = await fetch('/apps/provider-applications/submit', { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
          if (!response.ok) throw new Error('No se pudo cargar la búsqueda por dirección. Prueba buscar por ciudad.');
          const config = await response.json();
          key = config.config?.googleMapsBrowserApiKey || config.googleMapsBrowserApiKey;
        }
        if (!key) throw new Error('La búsqueda por dirección aún no está disponible. Puedes buscar por ciudad o usar tu ubicación.');
        const { PlaceAutocompleteElement } = await loadPlaces(key);
        this.widget = new PlaceAutocompleteElement({ includedRegionCodes: ['pe'] });
        this.widget.setAttribute('aria-label', 'Dirección en Perú');
        this.widget.addEventListener('input', () => { this.place = null; this.clearResults(); });
        this.widget.addEventListener('gmp-error', () => { this.place = null; status.textContent = 'No se pudieron cargar las sugerencias de Google. Prueba buscar por ciudad.'; });
        this.widget.addEventListener('gmp-select', async ({ placePrediction }) => {
          this.place = null;
          this.clearResults();
          const revision = this.revision;
          try {
            const place = placePrediction.toPlace();
            await place.fetchFields({ fields: ['location', 'formattedAddress'] });
            if (revision !== this.revision) return;
            if (!place.location) throw new Error();
            this.place = { latitude: place.location.lat(), longitude: place.location.lng(), label: place.formattedAddress };
            status.textContent = place.formattedAddress;
          } catch { status.textContent = 'No se pudo obtener esa dirección. Selecciona otra sugerencia.'; }
        });
        this.querySelector('[data-address-widget]').append(this.widget);
        status.textContent = 'Escribe una dirección y selecciona una sugerencia de Google.';
      } catch (error) { status.textContent = error.message; }
      finally { this.loading = false; }
    }
    async search(serviceHandle, radius, getDeviceLocation) {
      this.clearResults();
      const revision = this.revision;
      let location;
      if (this.mode.value === 'city') {
        if (!this.city.value.trim()) { this.city.focus(); throw new Error('Escribe la ciudad donde buscas el servicio.'); }
        location = { mode: 'city', city: this.city.value.trim(), label: this.city.value.trim() };
      } else if (this.mode.value === 'address') {
        if (!this.place) throw new Error('Selecciona una dirección de las sugerencias de Google.');
        location = { mode: 'address', ...this.place };
      } else {
        const position = await getDeviceLocation();
        location = { mode: 'device', latitude: position.coords.latitude, longitude: position.coords.longitude, label: 'tu ubicación' };
      }
      if (revision !== this.revision) return;
      const response = await fetch(`/apps/provider-applications/providers-nearby?service_handle=${encodeURIComponent(serviceHandle)}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('No se pudieron cargar los proveedores. Inténtalo de nuevo.');
      const payload = await response.json();
      if (!payload.ok || !Array.isArray(payload.providers)) throw new Error('No se pudieron cargar los proveedores. Inténtalo de nuevo.');
      if (revision !== this.revision) return;
      const providers = filterProviders(payload.providers, location, radius);
      const results = document.getElementById(this.closest('form').dataset.resultsId);
      results.replaceChildren();
      const heading = document.createElement('h2');
      heading.textContent = `Proveedores ${location.mode === 'city' ? 'en' : 'cerca de'} ${location.label}`;
      const summary = document.createElement('p');
      summary.textContent = providers.length ? `${providers.length} proveedores encontrados${location.mode === 'city' ? '.' : ` a menos de ${radius} km (distancia en línea recta).`}` : 'No encontramos proveedores para este servicio y ubicación. Prueba otra ciudad o amplía la distancia.';
      const list = document.createElement('ul');
      for (const provider of providers) {
        const item = document.createElement('li');
        const title = document.createElement('h3');
        title.textContent = provider.name;
        const address = document.createElement('p');
        address.textContent = provider.address;
        const link = document.createElement('a');
        const vendor = String(provider.vendorName || provider.name).replace(/["\\]/g, '');
        link.href = `/search?type=product&q=${encodeURIComponent(`vendor:"${vendor}"`)}`;
        link.textContent = 'Ver productos y servicios publicados';
        item.append(title, address);
        if (provider.distanceKm !== null) {
          const proximity = document.createElement('p');
          proximity.textContent = `${provider.distanceKm.toLocaleString('es-PE', { maximumFractionDigits: 1 })} km`;
          item.append(proximity);
        }
        item.append(link);
        list.append(item);
      }
      results.append(heading, summary, list);
      results.hidden = false;
      results.focus({ preventScroll: true });
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
})();
