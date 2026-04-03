(() => {
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
      'Resumen',
      `- Submission ID: ${payload.submission_id}`,
      `- Estado: ${payload.status}`,
      `- Provider slug: ${payload.provider_slug}`,
      '',
      'Datos del negocio',
      `- Nombre comercial: ${valueOrDash(payload.display_name)}`,
      `- Nombre legal o razon social: ${valueOrDash(payload.legal_name)}`,
      `- Nombre en catalogo: ${valueOrDash(payload.catalog_vendor_name)}`,
      '',
      'Contacto',
      `- Persona de contacto: ${valueOrDash(payload.contact_name)}`,
      `- Email: ${valueOrDash(payload.email)}`,
      `- Telefono: ${valueOrDash(payload.phone)}`,
      `- WhatsApp: ${valueOrDash(payload.whatsapp)}`,
      '',
      'Ubicacion',
      `- Direccion principal: ${valueOrDash(payload.address_line_1)}`,
      `- Informacion adicional: ${valueOrDash(payload.address_line_2)}`,
      `- Ciudad: ${valueOrDash(payload.city)}`,
      `- Codigo postal: ${valueOrDash(payload.postal_code)}`,
      `- Provincia o region: ${valueOrDash(payload.province_or_region)}`,
      `- Pais: ${valueOrDash(payload.country)}`,
      '',
      'Servicios',
      `- Categorias: ${payload.service_categories.length ? payload.service_categories.join(', ') : '-'}`,
      `- Horarios: ${valueOrDash(payload.opening_hours)}`,
      '',
      'Descripcion',
      valueOrDash(payload.description),
      '',
      'Presencia digital y activos',
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

  document.querySelectorAll('[data-provider-application-form]').forEach((form) => {
    const fieldsToValidate = Array.from(
      form.querySelectorAll(
        'input[required], input[type="email"], input[name="provider_website_url"], input[name="provider_instagram_url"], input[name="provider_logo_source_url"], textarea[name="provider_gallery_source_urls"]'
      )
    );
    const consentCheckbox = form.querySelector('[name="provider_consent"]');
    const categoryInputs = Array.from(form.querySelectorAll('input[name="provider_service_categories[]"]'));

    fieldsToValidate.forEach((field) => {
      field.addEventListener('blur', () => validateField(field));
      field.addEventListener('input', () => clearFieldError(field));
    });

    consentCheckbox?.addEventListener('change', () => {
      consentCheckbox.closest('.provider-application__choice')?.classList.remove('provider-application__choice--invalid');
      consentCheckbox.removeAttribute('aria-invalid');
    });

    categoryInputs.forEach((input) => {
      input.addEventListener('change', () => {
        const categoryError = form.querySelector('[data-provider-category-error]');
        if (categoryInputs.some((checkbox) => checkbox.checked)) {
          categoryError?.classList.remove('is-visible');
        }
      });
    });

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
          form.querySelector('.provider-application__field--invalid .field__input, .provider-application__field--invalid textarea') ||
          form.querySelector('[aria-invalid="true"]');
        firstInvalidField?.focus();
        return;
      }

      const submissionId = buildSubmissionId();

      const payload = {
        submission_id: submissionId,
        status: 'pending',
        provider_slug: providerSlug,
        display_name: displayName,
        legal_name: legalName,
        catalog_vendor_name: form.querySelector('[name="provider_catalog_vendor_name"]').value.trim(),
        contact_name: form.querySelector('[name="contact[name]"]').value.trim(),
        email: form.querySelector('[name="contact[email]"]').value.trim(),
        phone: form.querySelector('[name="contact[phone]"]').value.trim(),
        whatsapp: form.querySelector('[name="provider_whatsapp"]').value.trim(),
        address_line_1: form.querySelector('[name="provider_address_line_1"]').value.trim(),
        address_line_2: form.querySelector('[name="provider_address_line_2"]').value.trim(),
        city: form.querySelector('[name="provider_city"]').value.trim(),
        postal_code: form.querySelector('[name="provider_postal_code"]').value.trim(),
        province_or_region: form.querySelector('[name="provider_province_or_region"]').value.trim(),
        country: form.querySelector('[name="provider_country"]').value.trim(),
        service_categories: categories,
        description: form.querySelector('[name="provider_description"]').value.trim(),
        opening_hours: form.querySelector('[name="provider_opening_hours"]').value.trim(),
        website_url: form.querySelector('[name="provider_website_url"]').value.trim(),
        instagram_url: form.querySelector('[name="provider_instagram_url"]').value.trim(),
        logo_source_url: form.querySelector('[name="provider_logo_source_url"]').value.trim(),
        gallery_source_urls: form.querySelector('[name="provider_gallery_source_urls"]').value.trim(),
      };

      const hiddenBody = form.querySelector('[name="contact[body]"]');
      const hiddenSubmission = form.querySelector('[name="contact[provider_submission_id]"]');
      const hiddenSlug = form.querySelector('[name="contact[provider_slug]"]');
      const hiddenStatus = form.querySelector('[name="contact[provider_status]"]');
      const hiddenTopic = form.querySelector('[name="contact[provider_topic]"]');

      if (hiddenBody) hiddenBody.value = serializePayload(payload);
      if (hiddenSubmission) hiddenSubmission.value = submissionId;
      if (hiddenSlug) hiddenSlug.value = providerSlug;
      if (hiddenStatus) hiddenStatus.value = payload.status;
      if (hiddenTopic) hiddenTopic.value = 'Solicitud proveedor';
    });
  });
})();
