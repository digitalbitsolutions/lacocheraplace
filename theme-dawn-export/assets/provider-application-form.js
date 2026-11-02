(() => {
  const defaultProviderAppProxyPath = '';
  let googleMapsScriptPromise;
  let providerPublicConfigPromise;

  const urlFields = [
    'provider_website_url',
  ];

  const slugify = (value) =>
    (value || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const buildSubmissionId = () => {
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const random = Math.random().toString(36).slice(2, 8);
    return `provider-${stamp}-${random}`;
  };

  const normalizeBankAccount = (value) => (value || '').replace(/\s+/g, '').toUpperCase();

  const normalizeTaxId = (value) => (value || '').replace(/\s+/g, '').toUpperCase();

  const isValidBankAccount = (value) => {
    const account = normalizeBankAccount(value);
    if (!account) return false;
    return /^\d{8,20}$/.test(account);
  };

  const isValidPeruvianTaxId = (value) => {
    const taxId = normalizeTaxId(value);
    if (!taxId) return false;
    return /^\d{8}$/.test(taxId) || /^\d{11}$/.test(taxId);
  };

  const serializePayload = (payload, { redactSensitive = false } = {}) => {
    const valueOrDash = (value) => value || '-';
    const galleryUrls = payload.gallery_source_urls
      ? payload.gallery_source_urls
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
      : [];

    const lines = [
      'SOLICITUD DE PROVEEDOR',
      '',
      '=== RESUMEN ===',
      `- Submission ID: ${payload.submission_id}`,
      `- Estado: ${payload.status}`,
      `- Provider slug: ${payload.provider_slug}`,
      '',
      '=== DATOS DEL NEGOCIO ===',
      `- Nombre comercial: ${valueOrDash(payload.display_name)}`,
      `- Nombre legal o razon social: ${valueOrDash(payload.legal_name)}`,
      `- Nombre en catalogo: ${valueOrDash(payload.catalog_vendor_name)}`,
      '',
      '=== CONTACTO ===',
      `- Persona de contacto: ${valueOrDash(payload.contact_name)}`,
      `- Email: ${valueOrDash(payload.email)}`,
      `- Telefono: ${valueOrDash(payload.phone)}`,
      `- WhatsApp: ${valueOrDash(payload.whatsapp)}`,
      '',
      '=== UBICACION ===',
      `- Direccion principal: ${valueOrDash(payload.address_line_1)}`,
      `- Informacion adicional: ${valueOrDash(payload.address_line_2)}`,
      `- Ciudad: ${valueOrDash(payload.city)}`,
      `- Codigo postal: ${valueOrDash(payload.postal_code)}`,
      `- Departamento o region: ${valueOrDash(payload.province_or_region)}`,
      `- Pais: ${valueOrDash(payload.country)}`,
      `- Google Place ID: ${valueOrDash(payload.google_place_id)}`,
      `- Latitud: ${valueOrDash(payload.latitude)}`,
      `- Longitud: ${valueOrDash(payload.longitude)}`,
      '',
      '=== DATOS FISCALES Y BANCARIOS ===',
      `- Titular de la cuenta: ${valueOrDash(
        redactSensitive ? '[REDACTED: almacenado via app proxy]' : payload.account_holder
      )}`,
      `- RUC o DNI: ${valueOrDash(
        redactSensitive ? '[REDACTED: almacenado via app proxy]' : payload.tax_id
      )}`,
      `- CCI o numero de cuenta: ${valueOrDash(
        redactSensitive ? '[REDACTED: almacenado via app proxy]' : payload.iban
      )}`,
      `- Banco: ${valueOrDash(payload.bank_name)}`,
      `- Pais de la cuenta: ${valueOrDash(payload.bank_country)}`,
      '',
      '=== SERVICIOS ===',
      `- Categorias: ${payload.service_categories.length ? payload.service_categories.join(', ') : '-'}`,
      `- Horarios: ${valueOrDash(payload.opening_hours)}`,
      '',
      '=== DESCRIPCION ===',
      valueOrDash(payload.description),
      '',
      '=== PRESENCIA DIGITAL Y ACTIVOS ===',
      `- Sitio web: ${valueOrDash(payload.website_url)}`,
      `- Instagram: ${valueOrDash(payload.instagram_url)}`,
      `- Facebook: ${valueOrDash(payload.facebook_url)}`,
      `- TikTok: ${valueOrDash(payload.tiktok_url)}`,
      `- YouTube: ${valueOrDash(payload.youtube_url)}`,
      `- URL del logo: ${valueOrDash(payload.logo_source_url)}`,
      '- URLs de galeria:',
    ];

    if (galleryUrls.length) {
      galleryUrls.forEach((url) => lines.push(`  - ${url}`));
    } else {
      lines.push('  - -');
    }

    return lines.join('\n');
  };

  const isValidHttpUrl = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const sanitizeOptionalUrl = (value) => {
    const normalized = (value || '').trim();
    if (!normalized) return '';
    return isValidHttpUrl(normalized) ? normalized : '';
  };

  const sanitizeInstagramValue = (value) => {
    const normalized = (value || '').trim();
    if (!normalized) return '';
    if (normalized.startsWith('@')) return `https://instagram.com/${normalized.slice(1)}`;
    return isValidHttpUrl(normalized) ? normalized : '';
  };

  const initSocialLinks = (form, onChange) => {
    form.querySelectorAll('[data-provider-social-enabled]').forEach((toggle) => {
      const option = toggle.closest('.provider-application__social-option');
      const fieldName = toggle.dataset.providerSocialField;
      const input = option?.querySelector(`[name="${fieldName}"]`);
      const inputWrapper = option?.querySelector('[data-provider-social-input]');
      if (!input || !inputWrapper) return;

      const sync = () => {
        const enabled = toggle.checked;
        input.disabled = !enabled;
        input.required = enabled;
        inputWrapper.hidden = !enabled;
        if (!enabled) {
          input.value = '';
          clearFieldError(input);
        }
      };

      sync();
      toggle.addEventListener('change', () => {
        sync();
        onChange?.();
      });
    });
  };

  const sanitizeGalleryUrls = (value) => {
    const normalized = (value || '')
      .split(/[,\n]/)
      .map((line) => line.trim())
      .filter(Boolean);

    return normalized.every((line) => isValidHttpUrl(line)) ? normalized.join('\n') : '';
  };

  const getTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');
  const normalizeLocation = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const getProviderAppProxyUrl = (form) =>
    getTrimmedString(form?.dataset.providerAppProxyUrl) || defaultProviderAppProxyPath;

  const fetchProviderPublicConfig = async (form) => {
    if (providerPublicConfigPromise) return providerPublicConfigPromise;

    const proxyUrl = getProviderAppProxyUrl(form);
    if (!proxyUrl) {
      providerPublicConfigPromise = Promise.resolve({ googleMapsApiKey: '' });
      return providerPublicConfigPromise;
    }

    providerPublicConfigPromise = fetch(proxyUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || payload?.ok === false) {
          throw new Error(
            payload?.message || 'No se pudo cargar la configuracion publica del formulario.'
          );
        }

        return {
          googleMapsApiKey:
            getTrimmedString(payload?.config?.googleMapsBrowserApiKey) ||
            getTrimmedString(payload?.googleMapsBrowserApiKey),
        };
      })
      .catch((error) => {
        console.warn('[provider-application-form] Public config unavailable.', error);
        return { googleMapsApiKey: '' };
      });

    return providerPublicConfigPromise;
  };

  const resolveGoogleMapsApiKey = async (form) => {
    const themeApiKey = getTrimmedString(form?.dataset.googleMapsApiKey);
    if (themeApiKey) return themeApiKey;

    const publicConfig = await fetchProviderPublicConfig(form);
    return publicConfig.googleMapsApiKey || '';
  };

  const loadGoogleMapsPlaces = (apiKey) => {
    if (!apiKey) return Promise.reject(new Error('Las sugerencias de dirección no están disponibles.'));
    if (window.google?.maps?.importLibrary) return window.google.maps.importLibrary('places');
    if (googleMapsScriptPromise) return googleMapsScriptPromise;

    googleMapsScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const params = new URLSearchParams({
        key: apiKey,
        loading: 'async',
        libraries: 'places',
        v: 'weekly',
        language: document.documentElement.lang || 'es',
        region: 'PE',
        callback: 'providerApplicationGoogleMapsLoaded',
      });

      const timeout = window.setTimeout(
        () => reject(new Error('Google no respondió. Inténtalo de nuevo.')),
        15000
      );
      window.providerApplicationGoogleMapsLoaded = () => {
        window.clearTimeout(timeout);
        window.google?.maps?.importLibrary('places').then(resolve, reject);
      };
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('No se pudieron cargar las sugerencias de dirección.'));
      };
      document.head.appendChild(script);
    }).catch((error) => {
      googleMapsScriptPromise = null;
      throw error;
    });

    return googleMapsScriptPromise;
  };

  const setFieldValue = (field, value) => {
    if (!field) return;
    field.value = value || '';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const getAddressComponent = (components, type) =>
    components.find((component) => component.types.includes(type));

  const addressComponentText = (component) =>
    component?.longText || component?.long_name || component?.shortText || component?.short_name || '';

  const buildAddressLine = (components, fallbackValue) => {
    const streetNumber = addressComponentText(getAddressComponent(components, 'street_number'));
    const route = addressComponentText(getAddressComponent(components, 'route'));
    const composed = [route, streetNumber].filter(Boolean).join(' ').trim();
    return composed || fallbackValue || '';
  };

  const fillAddressFieldsFromPlace = (form, place) => {
    const components = place?.addressComponents || place?.address_components || [];
    if (!components.length) return;

    const addressLine1Field = form.querySelector('[data-provider-address-line-1]');
    const cityField = form.querySelector('[data-provider-city]');
    const postalCodeField = form.querySelector('[data-provider-postal-code]');
    const provinceField = form.querySelector('[data-provider-province]');
    const countryField = form.querySelector('[data-provider-country]');
    const placeIdField = form.querySelector('[name="provider_google_place_id"]');
    const latitudeField = form.querySelector('[name="provider_latitude"]');
    const longitudeField = form.querySelector('[name="provider_longitude"]');

    const postalCode = addressComponentText(getAddressComponent(components, 'postal_code'));
    const province =
      addressComponentText(getAddressComponent(components, 'administrative_area_level_1')) || '';
    const country = addressComponentText(getAddressComponent(components, 'country'));
    const countryCode = String(
      getAddressComponent(components, 'country')?.shortText ||
      getAddressComponent(components, 'country')?.short_name ||
      ''
    ).toLowerCase();
    if (countryCode !== 'pe') {
      throw new Error('Selecciona una dirección situada en Perú.');
    }
    if (!provinceField?.value || normalizeLocation(province) !== normalizeLocation(provinceField.value)) {
      throw new Error('La dirección debe pertenecer al departamento seleccionado.');
    }
    if (!cityField?.dataset.citySelected) {
      throw new Error('Selecciona primero una ciudad del departamento.');
    }
    const addressLine = buildAddressLine(
      components,
      place?.formattedAddress || place?.formatted_address || addressLine1Field?.value.trim()
    );
    const latitude = place?.location?.lat?.() ?? place?.geometry?.location?.lat?.();
    const longitude = place?.location?.lng?.() ?? place?.geometry?.location?.lng?.();

    setFieldValue(addressLine1Field, addressLine);
    setFieldValue(postalCodeField, postalCode);
    setFieldValue(countryField, country);
    setFieldValue(placeIdField, place?.id || place?.place_id || '');
    setFieldValue(latitudeField, latitude != null ? String(latitude) : '');
    setFieldValue(longitudeField, longitude != null ? String(longitude) : '');
  };

  const clearGeocodedFields = (form) => {
    setFieldValue(form.querySelector('[name="provider_google_place_id"]'), '');
    setFieldValue(form.querySelector('[name="provider_latitude"]'), '');
    setFieldValue(form.querySelector('[name="provider_longitude"]'), '');
  };

  const setAddressAutocompleteStatus = (form, message) => {
    const status = form.querySelector('[data-provider-address-status]');
    if (status) status.textContent = message;
  };

  const hideAddressSuggestions = (form) => {
    const suggestions = form.querySelector('[data-provider-address-suggestions]');
    if (!suggestions) return;
    suggestions.replaceChildren();
    suggestions.hidden = true;
  };

  const openingHoursDays = [
    ['monday', 'Lun'], ['tuesday', 'Mar'], ['wednesday', 'Mié'], ['thursday', 'Jue'],
    ['friday', 'Vie'], ['saturday', 'Sáb'], ['sunday', 'Dom'],
  ];

  const buildOpeningHours = (form) => ({
    version: 1,
    timezone: 'America/Lima',
    days: Array.from(form.querySelectorAll('[data-opening-hours-day]')).map((row) => {
      const enabled = row.querySelector('[data-opening-hours-enabled]')?.checked === true;
      const split = row.querySelector('[data-opening-hours-mode]')?.value === 'split';
      const periods = Array.from(row.querySelectorAll('[data-opening-hours-period]'))
        .slice(0, split ? 2 : 1)
        .map((period) => ({
          opens: period.querySelector('[data-opening-hours-open]')?.value || '',
          closes: period.querySelector('[data-opening-hours-close]')?.value || '',
        }));
      return { day: row.dataset.openingHoursDay, enabled, periods: enabled ? periods : [] };
    }),
  });

  const syncOpeningHours = (form, { showError = false } = {}) => {
    const hours = buildOpeningHours(form);
    const invalid = hours.days.find((day) => day.enabled && (!day.periods.length || day.periods.some((period) => !period.opens || !period.closes || period.opens >= period.closes) || (day.periods.length === 2 && day.periods[0].closes >= day.periods[1].opens)));
    const hasOpenDay = hours.days.some((day) => day.enabled);
    const message = !hasOpenDay
      ? 'Selecciona al menos un día de atención.'
      : invalid
        ? 'Cada franja debe tener una hora de cierre posterior a la apertura.'
        : '';
    const input = form.querySelector('[data-opening-hours-json]');
    const status = form.querySelector('[data-opening-hours-status]');
    if (input) input.value = message ? '' : JSON.stringify(hours);
    if (status) {
      status.textContent = message || hours.days.filter((day) => day.enabled).map((day) => {
        const label = openingHoursDays.find(([key]) => key === day.day)?.[1] || day.day;
        return `${label} ${day.periods.map((period) => `${period.opens}–${period.closes}`).join(' y ')}`;
      }).join(' · ');
      status.classList.toggle('provider-application__error', Boolean(showError && message));
      status.classList.toggle('is-visible', Boolean(showError && message));
    }
    return !message;
  };

  const syncOpeningHoursRow = (row) => {
    const enabled = row.querySelector('[data-opening-hours-enabled]');
    const mode = row.querySelector('[data-opening-hours-mode]');
    const secondPeriod = row.querySelector('[data-opening-hours-period="2"]');
    const timeInputs = Array.from(row.querySelectorAll('input[type="time"]'));
    const isEnabled = enabled?.checked === true;
    const isSplit = mode?.value === 'split';
    if (mode) mode.disabled = !isEnabled;
    if (secondPeriod) secondPeriod.hidden = !isSplit;
    timeInputs.forEach((input) => {
      const isSecondPeriod = input.closest('[data-opening-hours-period]')?.dataset.openingHoursPeriod === '2';
      input.disabled = !isEnabled || (isSecondPeriod && !isSplit);
      if (input.disabled) input.value = '';
    });
  };

  const initOpeningHours = (form) => {
    form.querySelectorAll('[data-opening-hours-day]').forEach((row) => {
      const enabled = row.querySelector('[data-opening-hours-enabled]');
      const mode = row.querySelector('[data-opening-hours-mode]');
      const timeInputs = Array.from(row.querySelectorAll('input[type="time"]'));
      enabled?.addEventListener('change', () => {
        syncOpeningHoursRow(row);
        syncOpeningHours(form);
        form.dispatchEvent(new Event('provider-hours-change'));
      });
      mode?.addEventListener('change', () => {
        syncOpeningHoursRow(row);
        syncOpeningHours(form);
        form.dispatchEvent(new Event('provider-hours-change'));
      });
      timeInputs.forEach((input) => input.addEventListener('change', () => {
        syncOpeningHours(form);
        form.dispatchEvent(new Event('provider-hours-change'));
      }));
      syncOpeningHoursRow(row);
    });

    form.querySelector('[data-opening-hours-copy-monday]')?.addEventListener('click', () => {
      const rows = Array.from(form.querySelectorAll('[data-opening-hours-day]'));
      const monday = rows[0];
      const mondayEnabled = monday?.querySelector('[data-opening-hours-enabled]');
      const status = form.querySelector('[data-opening-hours-status]');
      if (!monday || !mondayEnabled?.checked) {
        if (status) {
          status.textContent = 'Marca y completa el horario del lunes antes de copiarlo.';
          status.classList.add('provider-application__error', 'is-visible');
        }
        return;
      }

      const sourceMode = monday.querySelector('[data-opening-hours-mode]')?.value || 'continuous';
      const sourceTimes = Array.from(monday.querySelectorAll('input[type="time"]')).map((input) => input.value);
      rows.slice(1).forEach((row) => {
        const enabled = row.querySelector('[data-opening-hours-enabled]');
        const mode = row.querySelector('[data-opening-hours-mode]');
        if (enabled) enabled.checked = true;
        if (mode) mode.value = sourceMode;
        Array.from(row.querySelectorAll('input[type="time"]')).forEach((input, index) => {
          input.value = sourceTimes[index] || '';
        });
        syncOpeningHoursRow(row);
      });

      syncOpeningHours(form);
      form.dispatchEvent(new Event('provider-hours-change'));
    });
    syncOpeningHours(form);
  };

  const initGoogleAddressAutocomplete = async (form) => {
    const addressField = form.querySelector('[data-provider-address-line-1]');
    const suggestions = form.querySelector('[data-provider-address-suggestions]');
    const cityField = form.querySelector('[data-provider-city]');
    const provinceField = form.querySelector('[data-provider-province]');
    if (!addressField || !suggestions || !cityField || !provinceField) return;

    const syncCitySelect = () => {
      delete cityField.dataset.citySelected;
      const departmentKey = normalizeLocation(provinceField.value);
      const cities = Array.isArray(window.PROVIDER_CITIES_BY_DEPARTMENT?.[departmentKey])
        ? window.PROVIDER_CITIES_BY_DEPARTMENT[departmentKey]
        : [];
      cityField.replaceChildren();
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = provinceField.value
        ? (cities.length ? 'Selecciona una ciudad' : 'No hay ciudades disponibles')
        : 'Selecciona primero un departamento';
      cityField.appendChild(placeholder);
      cities.forEach((city) => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        cityField.appendChild(option);
      });
      cityField.disabled = !cities.length;
      addressField.value = '';
      addressField.disabled = true;
      addressField.placeholder = 'Selecciona primero ciudad';
      clearGeocodedFields(form);
      hideAddressSuggestions(form);
    };

    const syncSelectedCity = () => {
      const city = cityField.value.trim();
      if (!city) {
        delete cityField.dataset.citySelected;
        addressField.value = '';
        addressField.disabled = true;
        addressField.placeholder = 'Selecciona primero ciudad';
        clearGeocodedFields(form);
        hideAddressSuggestions(form);
        return;
      }
      cityField.dataset.citySelected = 'true';
      addressField.disabled = false;
      addressField.placeholder = 'Escribe la dirección del negocio';
      addressField.focus();
    };

    provinceField.addEventListener('change', syncCitySelect);
    cityField.addEventListener('change', syncSelectedCity);
    syncCitySelect();

    const apiKey = await resolveGoogleMapsApiKey(form);
    if (!apiKey) {
      setAddressAutocompleteStatus(form, 'Las sugerencias de dirección no están disponibles en este momento.');
      return;
    }

    try {
      const { AutocompleteSuggestion, AutocompleteSessionToken } = await loadGoogleMapsPlaces(apiKey);
      const countryBias = 'pe';
      let sessionToken;
      let revision = 0;
      let timer;
      const resetCity = () => {
        delete cityField.dataset.citySelected;
        const departmentKey = normalizeLocation(provinceField.value);
        const cities = Array.isArray(window.PROVIDER_CITIES_BY_DEPARTMENT?.[departmentKey])
          ? window.PROVIDER_CITIES_BY_DEPARTMENT[departmentKey]
          : [];
        cityField.replaceChildren();
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = provinceField.value
          ? (cities.length ? 'Selecciona una ciudad' : 'No hay ciudades disponibles')
          : 'Selecciona primero un departamento';
        cityField.appendChild(placeholder);
        cities.forEach((city) => {
          const option = document.createElement('option');
          option.value = city;
          option.textContent = city;
          cityField.appendChild(option);
        });
        cityField.disabled = !cities.length;
        addressField.value = '';
        addressField.disabled = true;
        addressField.placeholder = 'Selecciona primero ciudad';
        clearGeocodedFields(form);
        hideAddressSuggestions(form);
      };

      const selectCity = (city) => {
        cityField.value = city;
        cityField.dataset.citySelected = 'true';
        addressField.disabled = false;
        addressField.placeholder = 'Escribe la dirección del negocio';
        addressField.focus();
      };

      const selectSuggestion = async (place) => {
        await place.fetchFields({ fields: ['addressComponents', 'formattedAddress', 'location', 'id'] });
        fillAddressFieldsFromPlace(form, place);
        sessionToken = null;
        hideAddressSuggestions(form);
        setAddressAutocompleteStatus(form, 'Dirección de Perú seleccionada.');
      };

      const showSuggestions = async () => {
        const query = addressField.value.trim();
        const requestRevision = ++revision;
        clearGeocodedFields(form);
        if (query.length < 3) {
          hideAddressSuggestions(form);
          setAddressAutocompleteStatus(form, query ? 'Escribe al menos tres caracteres.' : '');
          return;
        }
        setAddressAutocompleteStatus(form, 'Buscando direcciones en Perú...');
        try {
          sessionToken ||= new AutocompleteSessionToken();
          const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: `${query}, ${cityField.value}, ${provinceField.value}, Perú`,
            includedRegionCodes: [countryBias],
            language: 'es',
            region: countryBias.toUpperCase(),
            sessionToken,
          });
          if (requestRevision !== revision || query !== addressField.value.trim()) return;
          const predictions = (response.suggestions || [])
            .map((item) => item.placePrediction)
            .filter(Boolean)
            .slice(0, 8);
          suggestions.replaceChildren();
          predictions.forEach((prediction, index) => {
            const item = document.createElement('li');
            const button = document.createElement('button');
            button.type = 'button';
            button.role = 'option';
            button.id = `${addressField.id}-option-${index}`;
            button.textContent = prediction.text?.toString() || query;
            button.addEventListener('click', () => {
              selectSuggestion(prediction.toPlace()).catch((error) => {
                setAddressAutocompleteStatus(form, error.message || 'No se pudo completar la dirección.');
              });
            });
            item.appendChild(button);
            suggestions.appendChild(item);
          });
          suggestions.hidden = predictions.length === 0;
          setAddressAutocompleteStatus(
            form,
            predictions.length ? `${predictions.length} sugerencias en Perú.` : 'No hay direcciones coincidentes en Perú.'
          );
        } catch (error) {
          if (requestRevision !== revision) return;
          hideAddressSuggestions(form);
          setAddressAutocompleteStatus(form, error.message || 'No se pudieron cargar las sugerencias de dirección.');
        }
      };

      addressField.addEventListener('input', () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(showSuggestions, 250);
      });
      addressField.addEventListener('focus', () => {
        if (addressField.value.trim().length >= 3) showSuggestions();
      });
      document.addEventListener('click', (event) => {
        if (!event.target.closest('[data-provider-address-autocomplete]')) hideAddressSuggestions(form);
      });
    } catch (error) {
      console.warn('[provider-application-form] Google Maps autocomplete unavailable.', error);
      setAddressAutocompleteStatus(form, 'Las sugerencias de dirección no están disponibles en este momento.');
    }
  };

  const getFieldWrapper = (element) => element?.closest('.field');

  const getOrCreateFieldError = (element) => {
    const wrapper = getFieldWrapper(element);
    if (!wrapper) return null;

    let error = wrapper.querySelector('.provider-application__field-error');
    if (!error) {
      error = document.createElement('p');
      error.className = 'provider-application__field-error';
      wrapper.appendChild(error);
    }

    return error;
  };

  const clearFieldError = (element) => {
    const wrapper = getFieldWrapper(element);
    const error = getOrCreateFieldError(element);
    if (wrapper) wrapper.classList.remove('provider-application__field--invalid');
    if (error) error.textContent = '';
    if (element?.setCustomValidity) element.setCustomValidity('');
    element?.removeAttribute('aria-invalid');
  };

  const setFieldError = (element, message) => {
    const wrapper = getFieldWrapper(element);
    const error = getOrCreateFieldError(element);
    if (wrapper) wrapper.classList.add('provider-application__field--invalid');
    if (error) error.textContent = message;
    if (element?.setCustomValidity) element.setCustomValidity(message);
    element?.setAttribute('aria-invalid', 'true');
  };

  const getValidationMessage = (element) => {
    const value = element.value.trim();

    if (element.hasAttribute('required') && !value) {
      return 'Este campo es obligatorio.';
    }

    if (!element.validity.valid) {
      return element.validationMessage || 'Revisa el valor de este campo.';
    }

    if (element.name === 'provider_city' && value && !element.dataset.citySelected) {
      return 'Selecciona una ciudad de la lista.';
    }

    if (element.type === 'email' && value && element.validity.typeMismatch) {
      return 'Introduce un correo electronico valido.';
    }

    if (element.name === 'provider_tax_id' && value && !isValidPeruvianTaxId(value)) {
      return 'Introduce un RUC de 11 digitos o un DNI de 8 digitos.';
    }

    if (element.name === 'provider_iban' && value && !isValidBankAccount(value)) {
      return 'Introduce un CCI o numero de cuenta valido (8 a 20 digitos).';
    }

    if (urlFields.includes(element.name) && value && !isValidHttpUrl(value)) {
      return 'Introduce una URL valida completa, por ejemplo https://...';
    }

    if (element.name === 'provider_instagram_url' && value) {
      if (value.startsWith('@')) return '';
      if (!isValidHttpUrl(value)) {
        return 'Introduce un @usuario o una URL valida completa.';
      }
    }

    if (['provider_facebook_url', 'provider_tiktok_url', 'provider_youtube_url'].includes(element.name) && value && !isValidHttpUrl(value)) {
      return 'Introduce una URL valida completa, por ejemplo https://...';
    }

    if (element.name === 'provider_gallery_source_urls' && value) {
      const invalidLine = value
        .split(/[,\n]/)
        .map((line) => line.trim())
        .find((line) => line && !isValidHttpUrl(line));

      if (invalidLine) {
        return 'Cada URL de galeria debe ser valida y empezar por http:// o https://.';
      }
    }

    return '';
  };

  const validateField = (element) => {
    if (!element) return true;

    clearFieldError(element);
    const message = getValidationMessage(element);

    if (message) {
      setFieldError(element, message);
      return false;
    }

    return true;
  };

  const checkFieldValidity = (element, { showErrors = false } = {}) => {
    if (!element) return true;

    if (!showErrors) {
      return !getValidationMessage(element);
    }

    return validateField(element);
  };

  const validateRequiredCheckbox = (checkbox) => {
    if (!checkbox) return true;

    const choice = checkbox.closest('.provider-application__choice');
    if (checkbox.checked) {
      choice?.classList.remove('provider-application__choice--invalid');
      checkbox.removeAttribute('aria-invalid');
      return true;
    }

    choice?.classList.add('provider-application__choice--invalid');
    checkbox.setAttribute('aria-invalid', 'true');
    return false;
  };

  const checkRequiredCheckboxValidity = (checkbox, { showErrors = false } = {}) => {
    if (!checkbox) return true;
    if (!showErrors) return checkbox.checked;
    return validateRequiredCheckbox(checkbox);
  };

  const updateSubmitButtonState = (form, isValid) => {
    const submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton) return;

    // El botón se mantiene disponible para que al pulsarlo se muestren todos
    // los errores pendientes, en lugar de quedar bloqueado sin explicación.
    if (form.dataset.providerSubmitting !== 'true') {
      submitButton.disabled = false;
      submitButton.setAttribute('aria-disabled', 'false');
    }
  };

  const setSubmitError = (form, message = '') => {
    const error = form.querySelector('[data-provider-submit-error]');
    if (!error) return;

    error.textContent = message;
    error.classList.toggle('is-visible', Boolean(message));
  };

  const showServerValidationErrors = (form, errors = {}) => {
    const fields = {
      displayName: '[name="provider_display_name"]',
      legalName: '[name="provider_legal_name"]',
      catalogVendorName: '[name="provider_catalog_vendor_name"]',
      contactName: '[name="contact[name]"]',
      email: '[name="contact[email]"]',
      phone: '[name="contact[phone]"]',
      whatsapp: '[name="provider_whatsapp"]',
      addressLine1: '[name="provider_address_line_1"]',
      city: '[name="provider_city"]',
      postalCode: '[name="provider_postal_code"]',
      provinceOrRegion: '[name="provider_province_or_region"]',
      country: '[name="provider_country"]',
      accountHolder: '[name="provider_account_holder"]',
      taxId: '[name="provider_tax_id"]',
      iban: '[name="provider_iban"]',
      bankName: '[name="provider_bank_name"]',
      bankCountry: '[name="provider_bank_country"]',
      description: '[name="provider_description"]',
      logoSourceUrl: '[data-provider-logo-file]',
    };

    Object.entries(errors).forEach(([key, message]) => {
      const text = String(message || 'Revisa este campo.');
      const field = fields[key] ? form.querySelector(fields[key]) : null;
      if (field) {
        setFieldError(field, text);
        return;
      }
      if (key === 'openingHours') {
        const status = form.querySelector('[data-opening-hours-status]');
        if (status) {
          status.textContent = text;
          status.classList.add('provider-application__error', 'is-visible');
        }
      }
      if (key === 'serviceCategories') {
        const categoryError = form.querySelector('[data-provider-category-error]');
        if (categoryError) {
          categoryError.textContent = text;
          categoryError.classList.add('is-visible');
        }
      }
      if (key === 'consentAccepted') validateRequiredCheckbox(form.querySelector('[name="provider_consent"]'));
    });
  };

  const validateFormState = (form, fieldsToValidate, consentCheckbox, categoryInputs, { showErrors = false } = {}) => {
    let isValid = true;

    if (!syncOpeningHours(form, { showError: showErrors })) {
      isValid = false;
    }

    fieldsToValidate.forEach((field) => {
      if (!checkFieldValidity(field, { showErrors })) {
        isValid = false;
      }
    });

    if (!checkRequiredCheckboxValidity(consentCheckbox, { showErrors })) {
      isValid = false;
    }

    const categoryError = form.querySelector('[data-provider-category-error]');
    const hasCategories = categoryInputs.some((checkbox) => checkbox.checked);
    if (!hasCategories) {
      isValid = false;
      if (showErrors && categoryError) {
        categoryError.classList.add('is-visible');
      }
    } else if (categoryError) {
      categoryError.classList.remove('is-visible');
    }

    const displayName = form.querySelector('[name="provider_display_name"]')?.value.trim() || '';
    const legalName = form.querySelector('[name="provider_legal_name"]')?.value.trim() || '';
    const providerSlug = slugify(displayName || legalName);
    const slugError = form.querySelector('[data-provider-slug-error]');

    if (!providerSlug) {
      isValid = false;
      if (showErrors && slugError) {
        slugError.classList.add('is-visible');
      }
    } else if (slugError) {
      slugError.classList.remove('is-visible');
    }

    updateSubmitButtonState(form, isValid);
    return isValid;
  };

  const syncHiddenFields = (form) => {
    if (!form) return;

    const displayName = form.querySelector('[name="provider_display_name"]')?.value.trim() || '';
    const legalName = form.querySelector('[name="provider_legal_name"]')?.value.trim() || '';
    const providerSlug = slugify(displayName || legalName);
    const categories = Array.from(
      form.querySelectorAll('input[name="provider_service_categories[]"]:checked')
    ).map((input) => input.value);

    const hiddenSubmission = form.querySelector('[name="provider_submission_id"]');
    const hiddenSlug = form.querySelector('[name="provider_slug"]');
    const hiddenStatus = form.querySelector('[name="provider_status"]');
    const hiddenTopic = form.querySelector('[name="provider_topic"]');
    const hiddenBody = form.querySelector('[name="contact[body]"]');

    let submissionId = hiddenSubmission?.value?.trim() || '';
    if (!submissionId) {
      submissionId = buildSubmissionId();
      if (hiddenSubmission) hiddenSubmission.value = submissionId;
    }

    const payload = {
      submission_id: submissionId,
      status: 'pending',
      provider_slug: providerSlug,
      display_name: displayName,
      legal_name: legalName,
      catalog_vendor_name: form.querySelector('[name="provider_catalog_vendor_name"]')?.value.trim() || '',
      contact_name: form.querySelector('[name="contact[name]"]')?.value.trim() || '',
      email: form.querySelector('[name="contact[email]"]')?.value.trim() || '',
      phone: form.querySelector('[name="contact[phone]"]')?.value.trim() || '',
      whatsapp: form.querySelector('[name="provider_whatsapp"]')?.value.trim() || '',
      address_line_1: form.querySelector('[name="provider_address_line_1"]')?.value.trim() || '',
      address_line_2: form.querySelector('[name="provider_address_line_2"]')?.value.trim() || '',
      city: form.querySelector('[name="provider_city"]')?.value.trim() || '',
      postal_code: form.querySelector('[name="provider_postal_code"]')?.value.trim() || '',
      province_or_region: form.querySelector('[name="provider_province_or_region"]')?.value.trim() || '',
      country: form.querySelector('[name="provider_country"]')?.value.trim() || '',
      google_place_id: form.querySelector('[name="provider_google_place_id"]')?.value.trim() || '',
      latitude: form.querySelector('[name="provider_latitude"]')?.value.trim() || '',
      longitude: form.querySelector('[name="provider_longitude"]')?.value.trim() || '',
      account_holder: form.querySelector('[name="provider_account_holder"]')?.value.trim() || '',
      tax_id: form.querySelector('[name="provider_tax_id"]')?.value.trim() || '',
      iban: normalizeBankAccount(form.querySelector('[name="provider_iban"]')?.value.trim() || ''),
      bank_name: form.querySelector('[name="provider_bank_name"]')?.value.trim() || '',
      bank_country: form.querySelector('[name="provider_bank_country"]')?.value.trim() || '',
      service_categories: categories,
      description: form.querySelector('[name="provider_description"]')?.value.trim() || '',
      opening_hours: form.querySelector('[name="provider_opening_hours"]')?.value.trim() || '',
      website_url: sanitizeOptionalUrl(form.querySelector('[name="provider_website_url"]')?.value),
      instagram_url: sanitizeInstagramValue(form.querySelector('[name="provider_instagram_url"]')?.value),
      facebook_url: sanitizeOptionalUrl(form.querySelector('[name="provider_facebook_url"]')?.value),
      tiktok_url: sanitizeOptionalUrl(form.querySelector('[name="provider_tiktok_url"]')?.value),
      youtube_url: sanitizeOptionalUrl(form.querySelector('[name="provider_youtube_url"]')?.value),
      logo_source_url: '',
      gallery_source_urls: '',
    };

    if (hiddenSlug) hiddenSlug.value = providerSlug;
    if (hiddenStatus) hiddenStatus.value = payload.status;
    if (hiddenTopic) hiddenTopic.value = 'Solicitud proveedor';
    const proxyConfigured = Boolean(getProviderAppProxyUrl(form));
    if (hiddenBody) hiddenBody.value = serializePayload(payload, { redactSensitive: proxyConfigured });

    return payload;
  };

  const submitStructuredRequest = async (form, payload) => {
    const proxyUrl = getProviderAppProxyUrl(form);
    if (!proxyUrl) return null;

    const logo = form.querySelector('[data-provider-logo-file]')?.files?.[0];
    const gallery = Array.from(form.querySelector('[data-provider-gallery-files]')?.files || []);
    const requestBody = {
      displayName: payload.display_name,
      legalName: payload.legal_name,
      catalogVendorName: payload.catalog_vendor_name,
      contactName: payload.contact_name,
      email: payload.email,
      phone: payload.phone,
      whatsapp: payload.whatsapp,
      addressLine1: payload.address_line_1,
      addressLine2: payload.address_line_2,
      city: payload.city,
      postalCode: payload.postal_code,
      provinceOrRegion: payload.province_or_region,
      country: payload.country,
      googlePlaceId: payload.google_place_id,
      latitude: payload.latitude,
      longitude: payload.longitude,
      accountHolder: payload.account_holder,
      taxId: payload.tax_id,
      iban: payload.iban,
      bankName: payload.bank_name,
      bankCountry: payload.bank_country,
      serviceCategories: payload.service_categories,
      description: payload.description,
      openingHours: payload.opening_hours,
      websiteUrl: payload.website_url,
      instagramUrl: payload.instagram_url,
      facebookUrl: payload.facebook_url,
      tiktokUrl: payload.tiktok_url,
      youtubeUrl: payload.youtube_url,
      logoSourceUrl: payload.logo_source_url,
      gallerySourceUrls: payload.gallery_source_urls,
      consentAccepted: true,
    };
    const formData = new FormData();
    formData.append('payload', JSON.stringify(requestBody));
    if (logo) formData.append('logo', logo);
    gallery.forEach((file) => formData.append('gallery', file));

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      body: formData,
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result?.ok) {
      const error = new Error(
        result?.message || 'No se pudo registrar la solicitud en Shopify Admin.'
      );
      error.validationErrors = result?.errors && typeof result.errors === 'object' ? result.errors : {};
      throw error;
    }

    return result;
  };

  document.querySelectorAll('[data-provider-application-form]').forEach((form) => {
    const fieldsToValidate = Array.from(
      form.querySelectorAll(
        'input[required], select[required], textarea[required], input[type="email"], input[name="provider_website_url"], input[data-provider-social-url]'
      )
    );
    const consentCheckbox = form.querySelector('[name="provider_consent"]');
    const categoryInputs = Array.from(form.querySelectorAll('input[name="provider_service_categories[]"]'));
    const imageInputs = Array.from(form.querySelectorAll('[data-provider-image-input]'));

    initSocialLinks(form, () => {
      setSubmitError(form, '');
      syncHiddenFields(form);
      validateFormState(form, fieldsToValidate, consentCheckbox, categoryInputs);
    });

    imageInputs.forEach((input) => input.addEventListener('change', () => {
      const tooMany = input.matches('[data-provider-gallery-files]') && input.files.length > 6;
      const invalidFile = Array.from(input.files).find((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024);
      input.setCustomValidity(tooMany ? 'Puedes adjuntar hasta 6 fotos para el book.' : invalidFile ? 'Cada imagen debe ser JPG, PNG o WebP y pesar como máximo 5 MB.' : '');
      syncHiddenFields(form);
      validateFormState(form, fieldsToValidate, consentCheckbox, categoryInputs);
    }));

    form.addEventListener('provider-hours-change', () => {
      syncHiddenFields(form);
      validateFormState(form, fieldsToValidate, consentCheckbox, categoryInputs);
    });

    fieldsToValidate.forEach((field) => {
      field.addEventListener('blur', () => validateField(field));
      field.addEventListener('input', () => {
        setSubmitError(form, '');
        clearFieldError(field);
        syncHiddenFields(form);
        validateFormState(form, fieldsToValidate, consentCheckbox, categoryInputs);
      });
      field.addEventListener('change', () => {
        setSubmitError(form, '');
        clearFieldError(field);
        syncHiddenFields(form);
        validateFormState(form, fieldsToValidate, consentCheckbox, categoryInputs);
      });
    });

    consentCheckbox?.addEventListener('change', () => {
      setSubmitError(form, '');
      consentCheckbox.closest('.provider-application__choice')?.classList.remove('provider-application__choice--invalid');
      consentCheckbox.removeAttribute('aria-invalid');
      syncHiddenFields(form);
      validateFormState(form, fieldsToValidate, consentCheckbox, categoryInputs);
    });

    categoryInputs.forEach((input) => {
      input.addEventListener('change', () => {
        setSubmitError(form, '');
        const categoryError = form.querySelector('[data-provider-category-error]');
        if (categoryInputs.some((checkbox) => checkbox.checked)) {
          categoryError?.classList.remove('is-visible');
        }
        syncHiddenFields(form);
        validateFormState(form, fieldsToValidate, consentCheckbox, categoryInputs);
      });
    });

    initOpeningHours(form);
    initGoogleAddressAutocomplete(form);
    syncHiddenFields(form);
    validateFormState(form, fieldsToValidate, consentCheckbox, categoryInputs);

    form.addEventListener('submit', (event) => {
      setSubmitError(form, '');
      const payload = syncHiddenFields(form);
      const isValid = validateFormState(form, fieldsToValidate, consentCheckbox, categoryInputs, {
        showErrors: true,
      });

      if (!isValid) {
        event.preventDefault();
        const firstInvalidField =
          form.querySelector('.provider-application__field--invalid .field__input, .provider-application__field--invalid textarea, .provider-application__field--invalid select') ||
          form.querySelector('[aria-invalid="true"]');
        firstInvalidField?.focus();
        firstInvalidField?.reportValidity?.();
        return;
      }

      if (form.dataset.providerProxySubmitted === 'true') {
        return;
      }

      const proxyUrl = getProviderAppProxyUrl(form);
      if (!proxyUrl) {
        syncHiddenFields(form);
        return;
      }

      event.preventDefault();
      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) {
        form.dataset.providerSubmitting = 'true';
        submitButton.disabled = true;
        submitButton.setAttribute('aria-disabled', 'true');
      }

      submitStructuredRequest(form, payload)
        .then((result) => {
          const hiddenSubmission = form.querySelector('[name="provider_submission_id"]');
          const hiddenSlug = form.querySelector('[name="provider_slug"]');

          if (hiddenSubmission && result?.submissionId) {
            hiddenSubmission.value = result.submissionId;
          }

          if (hiddenSlug && result?.providerSlug) {
            hiddenSlug.value = result.providerSlug;
          }

          imageInputs.forEach((input) => { input.value = ''; });
          syncHiddenFields(form);
          form.dataset.providerProxySubmitted = 'true';
          window.HTMLFormElement.prototype.submit.call(form);
        })
        .catch((error) => {
          delete form.dataset.providerSubmitting;
          showServerValidationErrors(form, error?.validationErrors);
          setSubmitError(
            form,
            Object.keys(error?.validationErrors || {}).length
              ? 'Revisa los campos marcados para poder enviar la solicitud.'
              : error instanceof Error
              ? error.message
              : 'No se pudo guardar la solicitud en la consola del Admin.'
          );
          validateFormState(form, fieldsToValidate, consentCheckbox, categoryInputs);
        });
    });
  });
})();
