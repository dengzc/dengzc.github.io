(function () {
    "use strict";

    const COLORS = ["#eff6fb", "#d9e9f5", "#b7d4ea", "#87bddc", "#5aa2cf", "#2f7fb9", "#0b559f"];
    const TEXT = {
        en: {
            locale: "en-US",
            title: "Explore municipalities",
            reset: "Reset",
            share: "Share this",
            embedLabel: "Embed code for this map",
            copyEmbed: "Copy code",
            copied: "Embed code copied.",
            copyFailed: "Copy failed. Select the code and copy it manually.",
            embedTitle: "Interactive map of additional birth leave take-up by municipality",
            selected: "Selected municipality",
            noSelection: "No municipality selected",
            prompt: "Choose a municipality on the map.",
            rate: "Take-up rate",
            code: "Municipality code",
            population: "Population",
            density: "Population density",
            densityUnit: "residents per km2",
            ci: "95% CI",
            mapped: "Mapped municipalities",
            mean: "Municipal mean",
            unavailable: "Not available",
            suppressed: "Fewer than 10 observations",
            legend: "Take-up of AGV",
            figureCaption: "Figure 4. Take-up of additional birth leave by municipality.",
            figureTakeaway: "Click a municipality to view its take-up rate with a 95% confidence interval and public municipal descriptors; read the map as descriptive orientation rather than causal evidence.",
        },
        nl: {
            locale: "nl-NL",
            title: "Verken gemeenten",
            reset: "Herstel",
            share: "Delen",
            embedLabel: "Embedcode voor deze kaart",
            copyEmbed: "Kopieer code",
            copied: "Embedcode gekopieerd.",
            copyFailed: "Kopieren is mislukt. Selecteer de code en kopieer deze handmatig.",
            embedTitle: "Interactieve kaart van het gebruik van aanvullend geboorteverlof per gemeente",
            selected: "Geselecteerde gemeente",
            noSelection: "Geen gemeente geselecteerd",
            prompt: "Kies een gemeente op de kaart.",
            rate: "Opnamepercentage",
            code: "Gemeentecode",
            population: "Inwoners",
            density: "Bevolkingsdichtheid",
            densityUnit: "inwoners per km2",
            ci: "95%-BI",
            mapped: "Gemeenten op de kaart",
            mean: "Gemeentelijk gemiddelde",
            unavailable: "Niet beschikbaar",
            suppressed: "Minder dan 10 waarnemingen",
            legend: "Opname van AGV",
            figureCaption: "Figuur 4. Gebruik van aanvullend geboorteverlof per gemeente.",
            figureTakeaway: "Klik op een gemeente voor het opnamepercentage met een 95%-betrouwbaarheidsinterval en openbare gemeentekenmerken; lees de kaart als beschrijvende oriëntatie en niet als causaal bewijs.",
        },
    };

    function localeFor(lang) {
        return TEXT[lang]?.locale || TEXT.en.locale;
    }

    function wilsonCI(p, n, z) {
        z = z || 1.96;
        if (!Number.isFinite(p) || !Number.isFinite(n) || n <= 0) return null;
        const denom = 1 + (z * z) / n;
        const center = (p + (z * z) / (2 * n)) / denom;
        const half = (z / denom) * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
        return [Math.max(0, center - half), Math.min(1, center + half)];
    }

    function formatPercent(value, lang) {
        if (!Number.isFinite(value)) return "n/a";
        return new Intl.NumberFormat(localeFor(lang), {
            style: "percent",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    }

    function formatInteger(value, lang) {
        if (!Number.isFinite(value)) return null;
        return new Intl.NumberFormat(localeFor(lang), { maximumFractionDigits: 0 }).format(value);
    }

    function escapeAttribute(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function shareUrlFor(container) {
        const base = container.dataset.embedSrc || window.location.href;
        const url = new URL(base, window.location.href);
        const lang = container.dataset.language || "en";
        url.searchParams.set("lang", lang);
        return url.href;
    }

    function embedCodeFor(container) {
        const lang = container.dataset.language || "en";
        const text = TEXT[lang] || TEXT.en;
        return `<iframe\n  src="${escapeAttribute(shareUrlFor(container))}"\n  title="${escapeAttribute(text.embedTitle)}"\n  style="width:100%;height:720px;border:0;"\n  loading="lazy"></iframe>`;
    }

    function refreshSharePanel(container) {
        const code = container.querySelector("[data-map-embed-code]");
        if (!code) return;
        code.value = embedCodeFor(container);

        const status = container.querySelector("[data-map-copy-status]");
        if (status) status.textContent = "";
    }

    function fallbackCopy(textarea) {
        textarea.focus();
        textarea.select();
        return document.execCommand("copy");
    }

    async function copyEmbedCode(container) {
        const textarea = container.querySelector("[data-map-embed-code]");
        if (!textarea) return;

        refreshSharePanel(container);
        const lang = container.dataset.language || "en";
        const text = TEXT[lang] || TEXT.en;
        const status = container.querySelector("[data-map-copy-status]");

        try {
            let copied = false;
            if (navigator.clipboard && window.isSecureContext) {
                try {
                    await navigator.clipboard.writeText(textarea.value);
                    copied = true;
                } catch (error) {
                    copied = false;
                }
            }

            if (!copied && !fallbackCopy(textarea)) {
                throw new Error("Copy command failed");
            }

            if (status) status.textContent = text.copied;
        } catch (error) {
            textarea.focus();
            textarea.select();
            if (status) status.textContent = text.copyFailed;
        }
    }

    function setupSharePanel(container) {
        if (container.dataset.shareReady === "true") return;

        const button = container.querySelector("[data-map-share]");
        const panel = container.querySelector("[data-map-share-panel]");
        if (!button || !panel) return;

        container.dataset.shareReady = "true";
        refreshSharePanel(container);

        button.addEventListener("click", () => {
            const willOpen = panel.hidden;
            panel.hidden = !willOpen;
            button.setAttribute("aria-expanded", String(willOpen));
            refreshSharePanel(container);

            if (willOpen) {
                const code = container.querySelector("[data-map-embed-code]");
                if (code) {
                    code.focus();
                    code.select();
                }
            }
        });

        const copyButton = container.querySelector("[data-map-copy-embed]");
        if (copyButton) {
            copyButton.addEventListener("click", () => copyEmbedCode(container));
        }
    }

    function binIndexFor(value, min, max) {
        const t = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
        return Math.min(COLORS.length - 1, Math.floor(t * COLORS.length));
    }

    function colorFor(value, min, max) {
        if (!Number.isFinite(value)) return "#d6d6d6";
        return COLORS[binIndexFor(value, min, max)];
    }

    function markLegend(container, value, min, max) {
        const swatches = container.querySelectorAll("[data-map-legend-swatches] span");
        const active = Number.isFinite(value) ? binIndexFor(value, min, max) : -1;
        swatches.forEach((swatch, i) => swatch.classList.toggle("is-active", i === active));
    }

    function decodeArc(topology, arcIndex) {
        const reverse = arcIndex < 0;
        const raw = topology.arcs[reverse ? ~arcIndex : arcIndex];
        let points;

        if (topology.transform) {
            const scale = topology.transform.scale;
            const translate = topology.transform.translate;
            let x = 0;
            let y = 0;
            points = raw.map((point) => {
                x += point[0];
                y += point[1];
                return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
            });
        } else {
            points = raw.map((point) => [point[0], point[1]]);
        }

        return reverse ? points.reverse() : points;
    }

    function polygonRings(topology, geometry) {
        if (geometry.type === "Polygon") {
            return [geometry.arcs.map((arcIndex) => decodeArc(topology, arcIndex))];
        }

        if (geometry.type === "MultiPolygon") {
            return geometry.arcs.map((polygon) => polygon.map((arcIndex) => decodeArc(topology, arcIndex)));
        }

        return [];
    }

    function collectBounds(features) {
        const bounds = {
            minX: Infinity,
            minY: Infinity,
            maxX: -Infinity,
            maxY: -Infinity,
        };

        features.forEach((feature) => {
            feature.polygons.forEach((polygon) => {
                polygon.forEach((ring) => {
                    ring.forEach(([x, y]) => {
                        bounds.minX = Math.min(bounds.minX, x);
                        bounds.minY = Math.min(bounds.minY, y);
                        bounds.maxX = Math.max(bounds.maxX, x);
                        bounds.maxY = Math.max(bounds.maxY, y);
                    });
                });
            });
        });

        return bounds;
    }

    function makeProjector(bounds, width, height, padding) {
        const sourceWidth = bounds.maxX - bounds.minX;
        const sourceHeight = bounds.maxY - bounds.minY;
        const scale = Math.min((width - padding * 2) / sourceWidth, (height - padding * 2) / sourceHeight);
        const offsetX = (width - sourceWidth * scale) / 2;
        const offsetY = (height - sourceHeight * scale) / 2;

        return ([x, y]) => [
            offsetX + (x - bounds.minX) * scale,
            height - (offsetY + (y - bounds.minY) * scale),
        ];
    }

    function pathData(feature, project) {
        const parts = [];
        feature.polygons.forEach((polygon) => {
            polygon.forEach((ring) => {
                if (!ring.length) return;
                const projected = ring.map(project);
                const [firstX, firstY] = projected[0];
                parts.push(`M${firstX.toFixed(2)},${firstY.toFixed(2)}`);
                for (let i = 1; i < projected.length; i += 1) {
                    const [x, y] = projected[i];
                    parts.push(`L${x.toFixed(2)},${y.toFixed(2)}`);
                }
                parts.push("Z");
            });
        });
        return parts.join("");
    }

    function featureLabel(feature) {
        const props = feature.properties;
        if (props.suppressed || !Number.isFinite(props.rate)) {
            return `${props.name}: ${TEXT.en.suppressed.toLowerCase()}`;
        }
        return `${props.name}: ${formatPercent(props.rate, "en")}`;
    }

    function setLanguage(container, lang) {
        container.dataset.language = lang;
        const scope = container.closest(".municipality-map-figure") || container;
        scope.querySelectorAll("[data-i18n]").forEach((node) => {
            const key = node.dataset.i18n;
            if (TEXT[lang][key]) node.textContent = TEXT[lang][key];
        });
        container.querySelectorAll("[data-map-lang]").forEach((button) => {
            button.setAttribute("aria-pressed", button.dataset.mapLang === lang ? "true" : "false");
        });
        refreshSharePanel(container);
    }

    function field(label, value) {
        const item = document.createElement("div");
        item.className = "municipality-map-field";

        const labelNode = document.createElement("span");
        labelNode.className = "municipality-map-field-label";
        labelNode.textContent = label;

        const valueNode = document.createElement("span");
        valueNode.className = "municipality-map-field-value";
        valueNode.textContent = value;

        item.append(labelNode, valueNode);
        return item;
    }

    function updateDetails(container, feature, summary) {
        const lang = container.dataset.language || "en";
        const text = TEXT[lang];
        const panelTitle = container.querySelector("[data-map-panel-title]");
        const panelSubtitle = container.querySelector("[data-map-panel-subtitle]");
        const fields = container.querySelector("[data-map-fields]");

        fields.replaceChildren();

        if (!feature) {
            panelTitle.textContent = text.noSelection;
            panelSubtitle.textContent = text.prompt;
            fields.append(
                field(text.mapped, formatInteger(summary.count, lang) || text.unavailable),
                field(text.mean, formatPercent(summary.mean, lang)),
            );
            markLegend(container, null, summary.min, summary.max);
            return;
        }

        const props = feature.properties;

        if (props.suppressed || !Number.isFinite(props.rate)) {
            panelTitle.textContent = props.name;
            panelSubtitle.textContent = text.selected;
            fields.append(field(text.rate, text.suppressed));
            markLegend(container, null, summary.min, summary.max);
            return;
        }

        const population = formatInteger(props.population, lang);
        const density = formatInteger(props.density, lang);

        panelTitle.textContent = props.name;
        panelSubtitle.textContent = text.selected;

        const items = [field(text.rate, formatPercent(props.rate, lang))];
        const ci = wilsonCI(props.rate, props.n);
        if (ci) {
            items.push(field(text.ci, `${formatPercent(ci[0], lang)}–${formatPercent(ci[1], lang)}`));
        }
        items.push(
            field(text.population, population || text.unavailable),
            field(text.density, density ? `${density} ${text.densityUnit}` : text.unavailable),
        );
        fields.append(...items);
        markLegend(container, props.rate, summary.min, summary.max);
    }

    function drawLegend(container, min, max) {
        const lang = container.dataset.language || "en";
        const swatches = container.querySelector("[data-map-legend-swatches]");
        const labels = container.querySelector("[data-map-legend-labels]");
        swatches.replaceChildren();
        labels.replaceChildren();

        COLORS.forEach((color) => {
            const swatch = document.createElement("span");
            swatch.style.background = color;
            swatches.append(swatch);
        });

        [min, (min + max) / 2, max].forEach((value) => {
            const label = document.createElement("span");
            label.textContent = formatPercent(value, lang);
            labels.append(label);
        });
    }

    async function initMap(container) {
        const response = await fetch(container.dataset.topojson);
        if (!response.ok) {
            throw new Error(`Unable to load ${container.dataset.topojson}`);
        }

        const topology = await response.json();
        const geometries = topology.objects.municipalities.geometries;
        const features = geometries.map((geometry) => ({
            id: geometry.id,
            properties: geometry.properties,
            polygons: polygonRings(topology, geometry),
        }));

        const rates = features.map((feature) => feature.properties.rate).filter(Number.isFinite);
        const summary = {
            count: features.length,
            min: Math.min(...rates),
            max: Math.max(...rates),
            mean: rates.reduce((sum, value) => sum + value, 0) / rates.length,
        };

        const svg = container.querySelector("[data-map-svg]");
        const width = 680;
        const height = 760;
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.setAttribute("role", "img");

        const bounds = collectBounds(features);
        const project = makeProjector(bounds, width, height, 16);
        let selectedId = null;

        drawLegend(container, summary.min, summary.max);
        updateDetails(container, null, summary);

        const fragment = document.createDocumentFragment();
        features.forEach((feature) => {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathData(feature, project));
            path.setAttribute("class", "municipality-map-shape");
            path.setAttribute("fill", colorFor(feature.properties.rate, summary.min, summary.max));
            path.setAttribute("tabindex", "0");
            path.setAttribute("role", "button");
            path.setAttribute("aria-label", featureLabel(feature));
            path.dataset.code = feature.id;

            const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
            title.textContent = featureLabel(feature);
            path.append(title);

            const select = () => {
                selectedId = feature.id;
                svg.querySelectorAll(".municipality-map-shape").forEach((node) => {
                    node.classList.toggle("is-selected", node.dataset.code === selectedId);
                });
                updateDetails(container, feature, summary);
            };

            path.addEventListener("mouseenter", () => {
                if (!selectedId) updateDetails(container, feature, summary);
            });
            path.addEventListener("mouseleave", () => {
                if (!selectedId) updateDetails(container, null, summary);
            });
            path.addEventListener("focus", () => {
                if (!selectedId) updateDetails(container, feature, summary);
            });
            path.addEventListener("blur", () => {
                if (!selectedId) updateDetails(container, null, summary);
            });
            path.addEventListener("click", select);
            path.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    select();
                }
            });

            fragment.append(path);
        });

        svg.append(fragment);

        container.querySelector("[data-map-reset]").addEventListener("click", () => {
            selectedId = null;
            svg.querySelectorAll(".municipality-map-shape").forEach((node) => node.classList.remove("is-selected"));
            updateDetails(container, null, summary);
        });

        container.querySelectorAll("[data-map-lang]").forEach((button) => {
            button.addEventListener("click", () => {
                setLanguage(container, button.dataset.mapLang);
                const selected = features.find((feature) => feature.id === selectedId) || null;
                drawLegend(container, summary.min, summary.max);
                updateDetails(container, selected, summary);
            });
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        document.querySelectorAll("[data-municipality-map]").forEach((container) => {
            setLanguage(container, container.dataset.language || "en");
            setupSharePanel(container);
            initMap(container).catch((error) => {
                container.classList.add("municipality-map-error");
                const errorNode = container.querySelector("[data-map-error]");
                if (errorNode) errorNode.textContent = error.message;
            });
        });
    });
})();
