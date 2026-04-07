(() => {
  let googleMapsScriptPromise;
  const googleMapsCallbackName = 'providerApplicationGoogleMapsLoaded';

  const urlFields = [
    'provider_website_url',
    'provider_instagram_url',
    'provider_logo_source_url',
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

  const normalizeIban = (value) => (value || '').replace(/\s+/g, '').toUpperCase();

  const isValidIban = (value) => {
    const iban = normalizeIban(value);
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) {
      return false;
    }

    const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
    let remainder = 0;

    for (const char of rearranged) {
      const fragment = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
      for (const digit of fragment) {
        remainder = (remainder * 10 + Number(digit)) % 97;
      }
    }

    return remainder === 1;
  };

  const serializePayload = (payload) => {
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
      `- Provincia o region: ${valueOrDash(payload.province_or_region)}`,
      `- Pais: ${valueOrDash(payload.country)}`,
      '',
      '=== DATOS FISCALES Y BANCARIOS ===',
      `- Titular de la cuenta: ${valueOrDash(payload.account_holder)}`,
      `- NIF/CIF: ${valueOrDash(payload.tax_id)}`,
      `- IBAN: ${valueOrDash(payload.iban)}`,
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

  const loadGoogleMapsPlaces = (apiKey) => {
    if (!apiKey) return Promise.resolve(null);
    if (window.google?.maps?.places) return Promise.resolve(window.google);
    if (googleMapsScriptPromise) return googleMapsScriptPromise;

    googleMapsScriptPromise = new Promise((resolve, reject) => {
      window[googleMapsCallbackName] = () => {
        if (window.google?.maps?.places) {
          resolve(window.google);
          return;
        }

        reject(new Error('Google Maps Places no se ha cargado correctamente.'));
      };

      const script = document.createElement('script');
      const params = new URLSearchParams({
        key: apiKey,
        libraries: 'places',
        language: document.documentElement.lang || 'es',
        callback: googleMapsCallbackName,
      });

      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error('No se pudo cargar Google Maps.'));
      document.head.appendChild(script);
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

  const buildAddressLine = (components, fallbackValue) => {
    const streetNumber = getAddressComponent(components, 'street_number')?.long_name || '';
    const route = getAddressComponent(components, 'route')?.long_name || '';
    const composed = [route, streetNumber].filter(Boolean).join(' ').trim();
    return composed || fallbackValue || '';
  };

  const fillAddressFieldsFromPlace = (form, place) => {
    const components = place?.address_components || [];
    if (!components.length) return;

    const addressLine1Field = form.querySelector('[data-provider-address-line-1]');
    const cityField = form.querySelector('[data-provider-city]');
    const postalCodeField = form.querySelector('[data-provider-postal-code]');
    const provinceField = form.querySelector('[data-provider-province]');
    const countryField = form.querySelector('[data-provider-country]');

    const city =
      getAddressComponent(components, 'locality')?.long_name ||
      getAddressComponent(components, 'postal_town')?.long_name ||
      getAddressComponent(components, 'administrative_area_level_2')?.long_name ||
      '';
    const postalCode = getAddressComponent(components, 'postal_code')?.long_name || '';
    const province =
      getAddressComponent(components, 'administrative_area_level_1')?.long_name || '';
    const country = getAddressComponent(components, 'country')?.long_name || '';
    const addressLine = buildAddressLine(components, addressLine1Field?.value.trim());

    setFieldValue(addressLine1Field, addressLine);
    setFieldValue(cityField, city);
    setFieldValue(postalCodeField, postalCode);
    setFieldValue(provinceField, province);
    setFieldValue(countryField, country);
  };

  const initGoogleAddressAutocomplete = async (form) => {
    const apiKey = form.dataset.googleMapsApiKey?.trim();
    if (!apiKey) return;

    const addressField = form.querySelector('[data-provider-address-line-1]');
    if (!addressField) return;

    try {
      await loadGoogleMapsPlaces(apiKey);

      if (!window.google?.maps?.places) return;

      const options = {
        fields: ['address_components', 'formatted_address'],
        types: ['address'],
      };
      const countryBias = form.dataset.googleMapsCountryBias?.trim().toLowerCase();
      if (countryBias) {
        options.componentRestrictions = { country: countryBias };
      }

      const autocomplete = new window.google.maps.places.Autocomplete(addressField, options);
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        fillAddressFieldsFromPlace(form, place);
      });
    } catch (error) {
      console.warn('[provider-application-form] Google Maps autocomplete unavailable.', error);
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
    element?.removeAttribute('aria-invalid');
  };

  const setFieldError = (element, message) => {
    const wrapper = getFieldWrapper(element);
    const error = getOrCreateFieldError(element);
    if (wrapper) wrapper.classList.add('provider-application__field--invalid');
    if (error) error.textContent = message;
    element?.setAttribute('aria-invalid', 'true');
  };

  const getValidationMessage = (element) => {
    const value = element.value.trim();

    if (element.validity.valueMissing) {
      return 'Este campo es obligatorio.';
    }

    if (element.type === 'email' && value && element.validity.typeMismatch) {
      return 'Introduce un correo electronico valido.';
    }

    if (element.name === 'provider_iban' && value && !isValidIban(value)) {
      return 'Introduce un IBAN valido.';
    }

    if (urlFields.includes(element.name) && value && !isValidHttpUrl(value)) {
      return 'Introduce una URL valida completa, por ejemplo https://...';
    }

    if (element.name === 'provider_gallery_source_urls' && value) {
      const invalidLine = value
        .split('\n')
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
      account_holder: form.querySelector('[name="provider_account_holder"]')?.value.trim() || '',
      tax_id: form.querySelector('[name="provider_tax_id"]')?.value.trim() || '',
      iban: normalizeIban(form.querySelector('[name="provider_iban"]')?.value.trim() || ''),
      bank_name: form.querySelector('[name="provider_bank_name"]')?.value.trim() || '',
      bank_country: form.querySelector('[name="provider_bank_country"]')?.value.trim() || '',
      service_categories: categories,
      description: form.querySelector('[name="provider_description"]')?.value.trim() || '',
      opening_hours: form.querySelector('[name="provider_opening_hours"]')?.value.trim() || '',
      website_url: form.querySelector('[name="provider_website_url"]')?.value.trim() || '',
      instagram_url: form.querySelector('[name="provider_instagram_url"]')?.value.trim() || '',
      logo_source_url: form.querySelector('[name="provider_logo_source_url"]')?.value.trim() || '',
      gallery_source_urls: form.querySelector('[name="provider_gallery_source_urls"]')?.value.trim() || '',
    };

    if (hiddenSlug) hiddenSlug.value = providerSlug;
    if (hiddenStatus) hiddenStatus.value = payload.status;
    if (hiddenTopic) hiddenTopic.value = 'Solicitud proveedor';
    if (hiddenBody) hiddenBody.value = serializePayload(payload);

    return payload;
  };

  document.querySelectorAll('[data-provider-application-form]').forEach((form) => {
    const fieldsToValidate = Array.from(
      form.querySelectorAll(
        'input[required], select[required], input[type="email"], input[name="provider_website_url"], input[name="provider_instagram_url"], input[name="provider_logo_source_url"], textarea[name="provider_gallery_source_urls"]'
      )
    );
    const consentCheckbox = form.querySelector('[name="provider_consent"]');
    const categoryInputs = Array.from(form.querySelectorAll('input[name="provider_service_categories[]"]'));

    fieldsToValidate.forEach((field) => {
      field.addEventListener('blur', () => validateField(field));
      field.addEventListener('input', () => {
        clearFieldError(field);
        syncHiddenFields(form);
      });
      field.addEventListener('change', () => {
        clearFieldError(field);
        syncHiddenFields(form);
      });
    });

    consentCheckbox?.addEventListener('change', () => {
      consentCheckbox.closest('.provider-application__choice')?.classList.remove('provider-application__choice--invalid');
      consentCheckbox.removeAttribute('aria-invalid');
      syncHiddenFields(form);
    });

    categoryInputs.forEach((input) => {
      input.addEventListener('change', () => {
        const categoryError = form.querySelector('[data-provider-category-error]');
        if (categoryInputs.some((checkbox) => checkbox.checked)) {
          categoryError?.classList.remove('is-visible');
        }
        syncHiddenFields(form);
      });
    });

    initGoogleAddressAutocomplete(form);
    syncHiddenFields(form);

    form.addEventListener('submit', (event) => {
      let isValid = true;
      const categories = Array.from(
        form.querySelectorAll('input[name="provider_service_categories[]"]:checked')
      ).map((input) => input.value);

      fieldsToValidate.forEach((field) => {
        if (!validateField(field)) {
          isValid = false;
        }
      });

      if (!validateRequiredCheckbox(consentCheckbox)) {
        isValid = false;
      }

      const categoryError = form.querySelector('[data-provider-category-error]');
      if (!categories.length) {
        isValid = false;
        if (categoryError) categoryError.classList.add('is-visible');
      } else if (categoryError) {
        categoryError.classList.remove('is-visible');
      }

      const displayName = form.querySelector('[name="provider_display_name"]').value.trim();
      const legalName = form.querySelector('[name="provider_legal_name"]').value.trim();
      const providerSlug = slugify(displayName || legalName);
      const slugError = form.querySelector('[data-provider-slug-error]');

      if (!providerSlug) {
        isValid = false;
        if (slugError) slugError.classList.add('is-visible');
      } else if (slugError) {
        slugError.classList.remove('is-visible');
      }

      if (!isValid) {
        event.preventDefault();
        const firstInvalidField =
          form.querySelector('.provider-application__field--invalid .field__input, .provider-application__field--invalid textarea, .provider-application__field--invalid select') ||
          form.querySelector('[aria-invalid="true"]');
        firstInvalidField?.focus();
        return;
      }

      syncHiddenFields(form);
    });
  });
})();
