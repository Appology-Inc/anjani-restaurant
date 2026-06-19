# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.ts >> Owner Dashboard Accessibility >> should not have any automatically detectable accessibility issues
- Location: tests/e2e/accessibility.spec.ts:5:3

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 849

- Array []
+ Array [
+   Object {
+     "description": "Ensure buttons have discernible text",
+     "help": "Buttons must have discernible text",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/button-name?application=playwright",
+     "id": "button-name",
+     "impact": "critical",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "button-has-visible-text",
+             "impact": "critical",
+             "message": "Element does not have inner text that is visible to screen readers",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "aria-label",
+             "impact": "critical",
+             "message": "aria-label attribute does not exist or is empty",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "aria-labelledby",
+             "impact": "critical",
+             "message": "aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "messageKey": "noAttr",
+             },
+             "id": "non-empty-title",
+             "impact": "critical",
+             "message": "Element has no title attribute",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "implicit-label",
+             "impact": "critical",
+             "message": "Element does not have an implicit (wrapped) <label>",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "explicit-label",
+             "impact": "critical",
+             "message": "Element does not have an explicit <label>",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "presentational-role",
+             "impact": "critical",
+             "message": "Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element does not have inner text that is visible to screen readers
+   aria-label attribute does not exist or is empty
+   aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
+   Element has no title attribute
+   Element does not have an implicit (wrapped) <label>
+   Element does not have an explicit <label>
+   Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"",
+         "html": "<button id=\"close-modal\" class=\"icon-btn\"><i class=\"ri-close-line\"></i></button>",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "#close-modal",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.name-role-value",
+       "wcag2a",
+       "wcag412",
+       "section508",
+       "section508.22.a",
+       "TTv5",
+       "TT6.a",
+       "EN-301-549",
+       "EN-9.4.1.2",
+       "ACT",
+       "RGAAv4",
+       "RGAA-11.9.1",
+     ],
+   },
+   Object {
+     "description": "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds",
+     "help": "Elements must meet minimum color contrast ratio thresholds",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=playwright",
+     "id": "color-contrast",
+     "impact": "serious",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#ff6b00",
+               "contrastRatio": 2.85,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#ffffff",
+               "fontSize": "7.8pt (10.4px)",
+               "fontWeight": "bold",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 2.85 (foreground color: #ffffff, background color: #ff6b00, font size: 7.8pt (10.4px), font weight: bold). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<span class=\"badge\">Web Dashboard</span>",
+                 "target": Array [
+                   ".badge",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 2.85 (foreground color: #ffffff, background color: #ff6b00, font size: 7.8pt (10.4px), font weight: bold). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"badge\">Web Dashboard</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".badge",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.color",
+       "wcag2aa",
+       "wcag143",
+       "TTv5",
+       "TT13.c",
+       "EN-301-549",
+       "EN-9.1.4.3",
+       "ACT",
+       "RGAAv4",
+       "RGAA-3.2.1",
+     ],
+   },
+   Object {
+     "description": "Ensure the order of headings is semantically correct",
+     "help": "Heading levels should only increase by one",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/heading-order?application=playwright",
+     "id": "heading-order",
+     "impact": "moderate",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "heading-order",
+             "impact": "moderate",
+             "message": "Heading order invalid",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Heading order invalid",
+         "html": "<h3 class=\"metric-value\" id=\"metric-revenue\">₹0</h3>",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           "#metric-revenue",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "heading-order",
+             "impact": "moderate",
+             "message": "Heading order invalid",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Heading order invalid",
+         "html": "<h3 class=\"console-title\">OWNER PANEL CONSOLE</h3>",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           ".console-title",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.semantics",
+       "best-practice",
+     ],
+   },
+   Object {
+     "description": "Ensure every form element has a label",
+     "help": "Form elements must have labels",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/label?application=playwright",
+     "id": "label",
+     "impact": "critical",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "implicit-label",
+             "impact": "critical",
+             "message": "Element does not have an implicit (wrapped) <label>",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "explicit-label",
+             "impact": "critical",
+             "message": "Element does not have an explicit <label>",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "aria-label",
+             "impact": "critical",
+             "message": "aria-label attribute does not exist or is empty",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "aria-labelledby",
+             "impact": "critical",
+             "message": "aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "messageKey": "noAttr",
+             },
+             "id": "non-empty-title",
+             "impact": "critical",
+             "message": "Element has no title attribute",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "messageKey": "noAttr",
+             },
+             "id": "non-empty-placeholder",
+             "impact": "critical",
+             "message": "Element has no placeholder attribute",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "presentational-role",
+             "impact": "critical",
+             "message": "Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element does not have an implicit (wrapped) <label>
+   Element does not have an explicit <label>
+   aria-label attribute does not exist or is empty
+   aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
+   Element has no title attribute
+   Element has no placeholder attribute
+   Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"",
+         "html": "<input type=\"text\" id=\"edit-name\">",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "#edit-name",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "implicit-label",
+             "impact": "critical",
+             "message": "Element does not have an implicit (wrapped) <label>",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "explicit-label",
+             "impact": "critical",
+             "message": "Element does not have an explicit <label>",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "aria-label",
+             "impact": "critical",
+             "message": "aria-label attribute does not exist or is empty",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "aria-labelledby",
+             "impact": "critical",
+             "message": "aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "messageKey": "noAttr",
+             },
+             "id": "non-empty-title",
+             "impact": "critical",
+             "message": "Element has no title attribute",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "messageKey": "noAttr",
+             },
+             "id": "non-empty-placeholder",
+             "impact": "critical",
+             "message": "Element has no placeholder attribute",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "presentational-role",
+             "impact": "critical",
+             "message": "Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element does not have an implicit (wrapped) <label>
+   Element does not have an explicit <label>
+   aria-label attribute does not exist or is empty
+   aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
+   Element has no title attribute
+   Element has no placeholder attribute
+   Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"",
+         "html": "<textarea id=\"edit-description\" rows=\"3\"></textarea>",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "#edit-description",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "implicit-label",
+             "impact": "critical",
+             "message": "Element does not have an implicit (wrapped) <label>",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "explicit-label",
+             "impact": "critical",
+             "message": "Element does not have an explicit <label>",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "aria-label",
+             "impact": "critical",
+             "message": "aria-label attribute does not exist or is empty",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "aria-labelledby",
+             "impact": "critical",
+             "message": "aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "messageKey": "noAttr",
+             },
+             "id": "non-empty-title",
+             "impact": "critical",
+             "message": "Element has no title attribute",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "messageKey": "noAttr",
+             },
+             "id": "non-empty-placeholder",
+             "impact": "critical",
+             "message": "Element has no placeholder attribute",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "presentational-role",
+             "impact": "critical",
+             "message": "Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element does not have an implicit (wrapped) <label>
+   Element does not have an explicit <label>
+   aria-label attribute does not exist or is empty
+   aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
+   Element has no title attribute
+   Element has no placeholder attribute
+   Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"",
+         "html": "<input type=\"number\" id=\"edit-price\">",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "#edit-price",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "implicitLabel": "",
+             },
+             "id": "implicit-label",
+             "impact": "critical",
+             "message": "Element does not have an implicit (wrapped) <label>",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<label class=\"switch\">
+               <input type=\"checkbox\" id=\"edit-available\">
+               <span class=\"slider round\"></span>
+             </label>",
+                 "target": Array [
+                   ".switch",
+                 ],
+               },
+             ],
+           },
+           Object {
+             "data": null,
+             "id": "explicit-label",
+             "impact": "critical",
+             "message": "Element does not have an explicit <label>",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "aria-label",
+             "impact": "critical",
+             "message": "aria-label attribute does not exist or is empty",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "aria-labelledby",
+             "impact": "critical",
+             "message": "aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "messageKey": "noAttr",
+             },
+             "id": "non-empty-title",
+             "impact": "critical",
+             "message": "Element has no title attribute",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "messageKey": "noAttr",
+             },
+             "id": "non-empty-placeholder",
+             "impact": "critical",
+             "message": "Element has no placeholder attribute",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "presentational-role",
+             "impact": "critical",
+             "message": "Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element does not have an implicit (wrapped) <label>
+   Element does not have an explicit <label>
+   aria-label attribute does not exist or is empty
+   aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
+   Element has no title attribute
+   Element has no placeholder attribute
+   Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"",
+         "html": "<input type=\"checkbox\" id=\"edit-available\">",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "#edit-available",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.forms",
+       "wcag2a",
+       "wcag412",
+       "section508",
+       "section508.22.n",
+       "TTv5",
+       "TT5.c",
+       "EN-301-549",
+       "EN-9.4.1.2",
+       "ACT",
+       "RGAAv4",
+       "RGAA-11.1.1",
+     ],
+   },
+   Object {
+     "description": "Ensure all page content is contained by landmarks",
+     "help": "All page content should be contained by landmarks",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/region?application=playwright",
+     "id": "region",
+     "impact": "moderate",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<div id=\"web-splash-screen\" class=\"web-splash-overlay\">",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           "#web-splash-screen",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<section class=\"analytics-strip\">",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           "section",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<h2>Edit Dish Details</h2>",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           "#edit-modal > .modal-card > .modal-header > h2",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<div class=\"form-group\">
+             <label>Dish Name</label>
+             <input type=\"text\" id=\"edit-name\">
+           </div>",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           "#edit-modal > .modal-card > .modal-body > .form-group:nth-child(2)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<div class=\"form-group\">
+             <label>Description</label>
+             <textarea id=\"edit-description\" rows=\"3\"></textarea>
+           </div>",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           ".form-group:nth-child(3)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<div class=\"form-group\">
+             <label>Price (₹)</label>
+             <input type=\"number\" id=\"edit-price\">
+           </div>",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           ".form-group:nth-child(4)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<div class=\"form-group toggle-group\">",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           ".toggle-group",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<div class=\"modal-header\">
+           <h2>Confirm Deletion</h2>
+         </div>",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           ".modal-sm.modal-card > .modal-header",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<div class=\"modal-body\">
+           <p id=\"confirm-text\">Are you sure you want to permanently delete this dish?</p>
+           <p class=\"warning-text\" style=\"color:var(--danger); font-size:0.85rem; margin-top:8px;\">This action cannot be undone and will remove the dish from all apps.</p>
+         </div>",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           "#confirm-modal > .modal-sm.modal-card > .modal-body",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<div class=\"web-brand-box\">",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           ".web-brand-box",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<div class=\"web-console-header\">
+             <i class=\"ri-shield-check-line console-icon\"></i>
+             <h3 class=\"console-title\">OWNER PANEL CONSOLE</h3>
+             <p class=\"console-subtitle\">Administrative &amp; Operations Authority Only</p>
+           </div>",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           ".web-console-header",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<div class=\"form-group web-input-group\">
+               <label><i class=\"ri-mail-line\" style=\"margin-right: 4px;\"></i> Owner Email Address</label>
+               <input type=\"email\" id=\"login-email\" placeholder=\"owner@anjani.com\" autocomplete=\"off\">
+             </div>",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           ".web-input-group.form-group:nth-child(1)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<div class=\"form-group web-input-group\">",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           ".web-input-group.form-group:nth-child(2)",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.keyboard",
+       "best-practice",
+       "RGAAv4",
+       "RGAA-9.2.1",
+     ],
+   },
+ ]
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e5]:
    - heading "ANJANI" [level=1] [ref=e6]
    - heading "RESTAURANT" [level=2] [ref=e7]
    - generic [ref=e11]: 
    - paragraph [ref=e12]: Kitchen & Dispatch Operations Suite
  - generic [ref=e13]:
    - banner [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]: 
        - generic [ref=e17]:
          - heading "Anjani Restaurant Web Dashboard" [level=1] [ref=e18]:
            - generic [ref=e19]: Anjani Restaurant
            - generic [ref=e20]: Web Dashboard
          - paragraph [ref=e21]: Kitchen & Dispatch Operations Suite
      - generic [ref=e22]:
        - text: 
        - generic [ref=e23]: 04:28:35 PM
        - generic [ref=e26]: Firebase Live
    - generic [ref=e27]:
      - generic [ref=e30]:
        - paragraph [ref=e31]: Total Revenue
        - heading "₹0" [level=3] [ref=e32]
      - generic [ref=e33]:
        - generic [ref=e35]: 
        - generic [ref=e36]:
          - paragraph [ref=e37]: Active Orders
          - heading "0" [level=3] [ref=e38]
      - generic [ref=e39]:
        - generic [ref=e41]: 
        - generic [ref=e42]:
          - paragraph [ref=e43]: Live Deliveries
          - heading "0" [level=3] [ref=e44]
      - generic [ref=e45]:
        - generic [ref=e47]: 
        - generic [ref=e48]:
          - paragraph [ref=e49]: Menu Items
          - heading "197" [level=3] [ref=e50]
    - generic [ref=e51]:
      - button " Operations Board" [ref=e52] [cursor=pointer]:
        - generic [ref=e53]: 
        - text: Operations Board
      - button " Menu Catalog" [ref=e54] [cursor=pointer]:
        - generic [ref=e55]: 
        - text: Menu Catalog
      - button " Historical Data" [ref=e56] [cursor=pointer]:
        - generic [ref=e57]: 
        - text: Historical Data
      - button " Analytics" [ref=e58] [cursor=pointer]:
        - generic [ref=e59]: 
        - text: Analytics
    - main [ref=e60]:
      - generic [ref=e62]:
        - generic [ref=e64]:
          - heading "Incoming Requests" [level=2] [ref=e65]
          - generic [ref=e66]: "0"
        - generic [ref=e68]:
          - heading "Preparation Queue" [level=2] [ref=e69]
          - generic [ref=e70]: "0"
        - generic [ref=e72]:
          - heading "Out for Delivery" [level=2] [ref=e73]
          - generic [ref=e74]: "0"
      - text:                                                                                                                                                                                                                                                                                                                                                                                                              
  - generic:
    - generic:
      - generic:
        - heading "Edit Dish Details" [level=2]
        - button "":
          - generic: 
      - generic:
        - generic:
          - generic: Dish Name
          - textbox
        - generic:
          - generic: Description
          - textbox
        - generic:
          - generic: Price (₹)
          - spinbutton
        - generic:
          - generic:
            - generic: Available Today
            - generic: Controls whether customers can order this dish
          - generic:
            - checkbox
        - button " Delete Dish Completely":
          - generic: 
          - text: Delete Dish Completely
      - generic:
        - button "Cancel"
        - button "Save Changes"
  - generic:
    - generic:
      - generic:
        - heading "Confirm Deletion" [level=2]
      - generic:
        - paragraph: Are you sure you want to permanently delete this dish?
        - paragraph: This action cannot be undone and will remove the dish from all apps.
      - generic:
        - button "Cancel"
        - button "Delete Forever"
  - generic [ref=e76]:
    - generic [ref=e77]:
      - generic [ref=e78]:
        - heading "ANJANI" [level=1] [ref=e79]
        - heading "RESTAURANT" [level=2] [ref=e80]
      - generic:
        - heading "ANJANI RESTAURANT" [level=1]
      - generic [ref=e81]:
        - generic [ref=e85]: 
        - paragraph [ref=e86]: Kitchen & Dispatch Operations Suite
    - generic [ref=e87]:
      - generic [ref=e88]:
        - generic [ref=e89]: 
        - heading "OWNER PANEL CONSOLE" [level=3] [ref=e90]
        - paragraph [ref=e91]: Administrative & Operations Authority Only
      - generic [ref=e92]:
        - generic [ref=e93]:
          - generic [ref=e94]:
            - generic [ref=e95]: 
            - text: Owner Email Address
          - textbox "owner@anjani.com" [ref=e96]
        - generic [ref=e97]:
          - generic [ref=e98]:
            - generic [ref=e99]: 
            - text: Security Password
          - generic [ref=e100]:
            - textbox "••••••••" [ref=e101]
            - generic [ref=e102] [cursor=pointer]: 
        - button "Sign In to Dashboard" [ref=e103] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import AxeBuilder from '@axe-core/playwright';
  3  | 
  4  | test.describe('Owner Dashboard Accessibility', () => {
  5  |   test('should not have any automatically detectable accessibility issues', async ({ page }) => {
  6  |     await page.goto('/');
  7  | 
  8  |     // Wait for the main app to load and login modal to be visible
  9  |     await page.waitForSelector('#login-overlay', { state: 'visible' });
  10 | 
  11 |     const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  12 | 
> 13 |     expect(accessibilityScanResults.violations).toEqual([]);
     |                                                 ^ Error: expect(received).toEqual(expected) // deep equality
  14 |   });
  15 | });
  16 | 
```