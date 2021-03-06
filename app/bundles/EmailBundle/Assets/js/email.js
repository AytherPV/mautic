/** EmailBundle **/
Mautic.emailOnLoad = function (container, response) {
    if (mQuery('#emailform_plainText').length) {
        // @todo initiate the token dropdown
    } else if (mQuery(container + ' #list-search').length) {
        Mautic.activateSearchAutocomplete('list-search', 'email');
    }

    var textarea = mQuery('#emailform_customHtml');

    mQuery(document).on('shown.bs.tab', function (e) {
        textarea.froalaEditor('popups.hideAll');
    });

    mQuery('a[href="#source-container"]').on('shown.bs.tab', function (e) {
        textarea.froalaEditor('html.set', textarea.val());
    });

    mQuery('.btn-builder').on('click', function (e) {
        textarea.froalaEditor('popups.hideAll');
    });

    Mautic.intiSelectTheme(mQuery('#emailform_template'));

    var plaintext = mQuery('#emailform_plainText');
    Mautic.initAtWho(plaintext, plaintext.attr('data-token-callback'));

    Mautic.initEmailDynamicContent();
};

Mautic.emailOnUnload = function(id) {
    if (id === '#app-content') {
        delete Mautic.listCompareChart;
    }
    mQuery('#emailform_customHtml').froalaEditor('popups.hideAll');
};

Mautic.insertEmailBuilderToken = function(editorId, token) {
    var editor = Mautic.getEmailBuilderEditorInstances();
    editor[instance].insertText(token);
};

Mautic.getEmailAbTestWinnerForm = function(abKey) {
    if (abKey && mQuery(abKey).val() && mQuery(abKey).closest('.form-group').hasClass('has-error')) {
        mQuery(abKey).closest('.form-group').removeClass('has-error');
        if (mQuery(abKey).next().hasClass('help-block')) {
            mQuery(abKey).next().remove();
        }
    }

    Mautic.activateLabelLoadingIndicator('emailform_variantSettings_winnerCriteria');
    var emailId = mQuery('#emailform_sessionId').val();

    var query = "action=email:getAbTestForm&abKey=" + mQuery(abKey).val() + "&emailId=" + emailId;

    mQuery.ajax({
        url: mauticAjaxUrl,
        type: "POST",
        data: query,
        dataType: "json",
        success: function (response) {
            if (typeof response.html != 'undefined') {
                if (mQuery('#emailform_variantSettings_properties').length) {
                    mQuery('#emailform_variantSettings_properties').replaceWith(response.html);
                } else {
                    mQuery('#emailform_variantSettings').append(response.html);
                }

                if (response.html != '') {
                    Mautic.onPageLoad('#emailform_variantSettings_properties', response);
                }
            }
        },
        error: function (request, textStatus, errorThrown) {
            Mautic.processAjaxError(request, textStatus, errorThrown);
        },
        complete: function() {
            Mautic.removeLabelLoadingIndicator();
        }
    });
};

Mautic.submitSendForm = function () {
    Mautic.dismissConfirmation();
    mQuery('.btn-send').prop('disabled', true);
    mQuery('form[name=\'batch_send\']').submit();
};

Mautic.emailSendOnLoad = function (container, response) {
    if (mQuery('.email-send-progress').length) {
        if (!mQuery('#emailSendProgress').length) {
            Mautic.clearModeratedInterval('emailSendProgress');
        } else {
            Mautic.setModeratedInterval('emailSendProgress', 'sendEmailBatch', 2000);
        }
    }
};

Mautic.emailSendOnUnload = function () {
    if (mQuery('.email-send-progress').length) {
        Mautic.clearModeratedInterval('emailSendProgress');
        if (typeof Mautic.sendEmailBatchXhr != 'undefined') {
            Mautic.sendEmailBatchXhr.abort();
            delete Mautic.sendEmailBatchXhr;
        }
    }
};

Mautic.sendEmailBatch = function () {
    var data = 'id=' + mQuery('.progress-bar-send').data('email') + '&pending=' + mQuery('.progress-bar-send').attr('aria-valuemax') + '&batchlimit=' + mQuery('.progress-bar-send').data('batchlimit');
    Mautic.sendEmailBatchXhr = Mautic.ajaxActionRequest('email:sendBatch', data, function (response) {
        if (response.progress) {
            if (response.progress[0] > 0) {
                mQuery('.imported-count').html(response.progress[0]);
                mQuery('.progress-bar-send').attr('aria-valuenow', response.progress[0]).css('width', response.percent + '%');
                mQuery('.progress-bar-send span.sr-only').html(response.percent + '%');
            }

            if (response.progress[0] >= response.progress[1]) {
                Mautic.clearModeratedInterval('emailSendProgress');

                setTimeout(function () {
                    mQuery.ajax({
                        type: 'POST',
                        showLoadingBar: false,
                        url: window.location,
                        data: 'complete=1',
                        success: function (response) {

                            if (response.newContent) {
                                // It's done so pass to process page
                                Mautic.processPageContent(response);
                            }
                        }
                    });
                }, 1000);
            }
        }

        Mautic.moderatedIntervalCallbackIsComplete('emailSendProgress');
    });
};

Mautic.autoGeneratePlaintext = function() {
    mQuery('.plaintext-spinner').removeClass('hide');

    Mautic.ajaxActionRequest(
        'email:generatePlaintText',
        {
            id: mQuery('#emailform_sessionId').val(),
            custom: mQuery('#emailform_customHtml').val()
        },
        function (response) {
            mQuery('#emailform_plainText').val(response.text);
            mQuery('.plaintext-spinner').addClass('hide');
        }
    );
};

Mautic.selectEmailType = function(emailType) {
    if (emailType == 'list') {
        mQuery('#leadList').removeClass('hide');
        mQuery('#segmentTranslationParent').removeClass('hide');
        mQuery('#templateTranslationParent').addClass('hide');
        mQuery('.page-header h3').text(mauticLang.newListEmail);
    } else {
        mQuery('#segmentTranslationParent').addClass('hide');
        mQuery('#templateTranslationParent').removeClass('hide');
        mQuery('#leadList').addClass('hide');
        mQuery('.page-header h3').text(mauticLang.newTemplateEmail);
    }

    mQuery('#emailform_emailType').val(emailType);

    mQuery('body').removeClass('noscroll');

    mQuery('.email-type-modal').remove();
    mQuery('.email-type-modal-backdrop').remove();
};

Mautic.getTotalAttachmentSize = function() {
    var assets = mQuery('#emailform_assetAttachments').val();
    if (assets) {
        assets = {
            'assets': assets
        };
        Mautic.ajaxActionRequest('email:getAttachmentsSize', assets, function(response) {
            mQuery('#attachment-size').text(response.size);
        });
    } else {
        mQuery('#attachment-size').text('0');
    }
};

Mautic.standardEmailUrl = function(options) {
    if (!options) {
        return;
    }

    var url = options.windowUrl;
    if (url) {
        var editEmailKey = '/emails/edit/emailId';
        var previewEmailKey = '/email/preview/emailId';
        if (url.indexOf(editEmailKey) > -1 ||
            url.indexOf(previewEmailKey) > -1) {
            options.windowUrl = url.replace('emailId', mQuery('#campaignevent_properties_email').val());
        }
    }

    return options;
};

Mautic.disabledEmailAction = function(opener) {
    if (typeof opener == 'undefined') {
        opener = window;
    }
    var email = opener.mQuery('#campaignevent_properties_email').val();

    var disabled = email === '' || email === null;

    opener.mQuery('#campaignevent_properties_editEmailButton').prop('disabled', disabled);
    opener.mQuery('#campaignevent_properties_previewEmailButton').prop('disabled', disabled);
};

Mautic.initEmailDynamicContent = function() {
    if (mQuery('#dynamic-content-container').length) {
        mQuery('#emailFilters .remove-selected').each( function (index, el) {
            mQuery(el).on('click', function () {
                mQuery(this).closest('.panel').animate(
                    {'opacity': 0},
                    'fast',
                    function () {
                        mQuery(this).remove();
                    }
                );

                if (!mQuery('#emailFilters li:not(.placeholder)').length) {
                    mQuery('#emailFilters li.placeholder').removeClass('hide');
                } else {
                    mQuery('#emailFilters li.placeholder').addClass('hide');
                }
            });
        });

        mQuery('#addNewDynamicContent').on('click', function (e) {
            e.preventDefault();

            var tabHolder               = mQuery('#dynamicContentTabs');
            var filterHolder            = mQuery('#dynamicContentContainer');
            var dynamicContentPrototype = mQuery('#dynamicContentPrototype').data('prototype');
            var dynamicContentIndex     = tabHolder.find('li').length - 1;
            var tabId                   = '#emailform_dynamicContent_' + dynamicContentIndex;
            var tokenName               = 'Dynamic Content ' + (dynamicContentIndex + 1);
            var newForm                 = dynamicContentPrototype.replace(/__name__/g, dynamicContentIndex);
            var newTab                  = mQuery('<li><a role="tab" data-toggle="tab" href="' + tabId + '">' + tokenName + '</a></li>');


            tabHolder.append(newTab);
            filterHolder.append(newForm);

            var itemContainer = mQuery(tabId);
            var textarea      = itemContainer.find('.editor');
            var firstInput    = itemContainer.find('input[type="text"]').first();

            textarea.froalaEditor(mQuery.extend({}, Mautic.basicFroalaOptions, {
                // Set custom buttons with separator between them.
                toolbarButtons: ['undo', 'redo', '|', 'bold', 'italic', 'underline', 'fontFamily', 'fontSize', 'color', 'align', 'orderedList', 'unorderedList', 'quote', 'clearFormatting', 'insertLink', 'insertImage'],
                heightMin: 100
            }));

            tabHolder.find('i').first().removeClass('fa-spinner fa-spin').addClass('fa-plus text-success');
            newTab.find('a').tab('show');

            firstInput.focus();

            Mautic.updateDynamicContentDropdown();

            Mautic.initDynamicContentItem(tabId);
        });

        Mautic.initDynamicContentItem();
    }
};

Mautic.initDynamicContentItem = function (tabId) {
    var $el = mQuery('#dynamic-content-container');

    if (typeof tabId != "undefined") {
        $el = mQuery(tabId);
    }

    $el.find('.addNewDynamicContentFilter').on('click', function (e) {
        e.preventDefault();

        var $this                = mQuery(this);
        var parentElement        = $this.parents('.panel');
        var tabHolder            = parentElement.find('.nav');
        var filterHolder         = parentElement.find('.tab-content');
        var filterBlockPrototype = mQuery('#filterBlockPrototype');
        var filterIndex          = filterHolder.find('.tab-pane').length;
        var dynamicContentIndex  = $this.data('index');

        var filterPrototype   = filterBlockPrototype.data('prototype');
        var filterContainerId = '#emailform_dynamicContent_' + dynamicContentIndex + '_filters_' + filterIndex;
        var newTab            = mQuery('<li><a role="tab" data-toggle="tab" href="' + filterContainerId + '">Variation ' + (filterIndex + 1) + '</a></li>');
        var newForm           = filterPrototype.replace(/__name__/g, filterIndex)
            .replace(/dynamicContent_0_filters/g, 'dynamicContent_' + dynamicContentIndex + '_filters')
            .replace(/dynamicContent]\[0]\[filters/g, 'dynamicContent][' + dynamicContentIndex + '][filters');

        tabHolder.append(newTab);
        filterHolder.append(newForm);

        var filterContainer  = mQuery(filterContainerId);
        var availableFilters = filterContainer.find('select[data-mautic="available_filters"]');
        var altTextarea      = filterContainer.find('.editor');
        var removeButton     = filterContainer.find('.remove-item');

        Mautic.activateChosenSelect(availableFilters);

        availableFilters.on('change', function() {
            var $this = mQuery(this);

            if ($this.val()) {
                Mautic.addDynamicContentFilter($this.val());
                $this.val('');
                $this.trigger('chosen:updated');
            }
        });

        altTextarea.froalaEditor(mQuery.extend({}, Mautic.basicFroalaOptions, {
            // Set custom buttons with separator between them.
            toolbarButtons: ['undo', 'redo', '|', 'bold', 'italic', 'underline', 'fontFamily', 'fontSize', 'color', 'align', 'orderedList', 'unorderedList', 'quote', 'clearFormatting', 'insertLink', 'insertImage'],
            heightMin: 100
        }));

        Mautic.initRemoveEvents(removeButton);

        newTab.find('a').tab('show');
    });

    $el.find('.dynamic-content-token-name').on('input', function (e) {
        var $this = mQuery(this);
        var parentTab = $this.parents('.tab-pane');
        var correspondingTabLink = mQuery('a[href="#' + parentTab.attr('id') + '"]');
        var tabContainer = correspondingTabLink.parents('ul').first();
        var correspondingTabLinkIndex = tabContainer.find('a[data-toggle="tab"]').index(correspondingTabLink);

        var tokenName = $this.val() || 'Dynamic Content ' + (correspondingTabLinkIndex + 1);

        correspondingTabLink.text(tokenName);

        Mautic.updateDynamicContentDropdown();
    });

    $el.find('a.remove-selected').on('click', function() {
        mQuery(this).closest('.panel').animate(
            {'opacity': 0},
            'fast',
            function () {
                mQuery(this).remove();
            }
        );
    });

    $el.find('select[data-mautic="available_filters"]').on('change', function() {
        var $this = mQuery(this);

        if ($this.val()) {
            Mautic.addDynamicContentFilter($this.val());
            $this.val('');
            $this.trigger('chosen:updated');
        }
    });

    Mautic.initRemoveEvents($el.find('.remove-item'));
};

Mautic.updateDynamicContentDropdown = function () {
    var options = [];

    mQuery('#dynamicContentTabs').find('a[data-toggle="tab"]').each(function () {
        var prototype       = '<li><a class="fr-command" data-cmd="dynamicContent" data-param1="__tokenName__">__tokenName__</a></li>';
        var newOption       = prototype.replace(/__tokenName__/g, mQuery(this).text());

        options.push(newOption);
    });

    mQuery('button[data-cmd="dynamicContent"]').next().find('ul').html(options.join(''));
};

Mautic.initRemoveEvents = function (elements) {
    if (elements.hasClass('remove-selected')) {
        elements.on('click', function() {
            mQuery(this).closest('.panel').animate(
                {'opacity': 0},
                'fast',
                function () {
                    mQuery(this).remove();
                }
            );
        });
    } else {
        elements.on('click', function (e) {
            e.preventDefault();

            var $this         = mQuery(this);
            var parentElement = $this.parents('.tab-pane.dynamic-content');

            if ($this.hasClass('remove-filter')) {
                parentElement = $this.parents('.tab-pane.dynamic-content-filter');
            }

            var tabLink      = mQuery('a[href="#' + parentElement.attr('id') + '"]').parent();
            var tabContainer = tabLink.parent();

            parentElement.remove();
            tabLink.remove();
            tabContainer.find('li').first().next().find('a').tab('show');

            Mautic.updateDynamicContentDropdown();
        });
    }
};

Mautic.addDynamicContentFilter = function (selectedFilter) {
    var dynamicContentItems  = mQuery('.tab-pane.dynamic-content');
    var activeDynamicContent = dynamicContentItems.filter(':visible');
    var dynamicContentIndex  = dynamicContentItems.index(activeDynamicContent);

    var dynamicContentFilterContainers      = activeDynamicContent.find('div[data-filter-container]');
    var activeDynamicContentFilterContainer = dynamicContentFilterContainers.filter(':visible');
    var dynamicContentFilterIndex           = dynamicContentFilterContainers.index(activeDynamicContentFilterContainer);

    var selectedOption  = mQuery('option[data-mautic="available_' + selectedFilter + '"]').first();
    var label           = selectedOption.text();

    // create a new filter
    var filterNum   = activeDynamicContentFilterContainer.children('.panel').length;
    var prototype   = mQuery('#filterSelectPrototype').data('prototype');
    var fieldObject = selectedOption.data('field-object');
    var fieldType   = selectedOption.data('field-type');
    var isSpecial   = (mQuery.inArray(fieldType, ['leadlist', 'lead_email_received', 'tags', 'multiselect', 'boolean', 'select', 'country', 'timezone', 'region', 'stage', 'locale']) != -1);

    // Update the prototype settings
    prototype = prototype.replace(/__name__/g, filterNum)
        .replace(/__label__/g, label)
        .replace(/dynamicContent_0_filters/g, 'dynamicContent_' + dynamicContentIndex + '_filters')
        .replace(/dynamicContent]\[0]\[filters/g, 'dynamicContent][' + dynamicContentIndex + '][filters')
        .replace(/filters_0_filters/g, 'filters_' + dynamicContentFilterIndex + '_filters')
        .replace(/filters]\[0]\[filters/g, 'filters][' + dynamicContentFilterIndex + '][filters');

    if (filterNum === 0) {
        prototype = prototype.replace(/in-group/g, '');
    }

    // Convert to DOM
    prototype = mQuery(prototype);

    if (fieldObject == 'company') {
        prototype.find('.object-icon').removeClass('fa-user').addClass('fa-building');
    } else {
        prototype.find('.object-icon').removeClass('fa-building').addClass('fa-user');
    }

    var filterBase  = "emailform[dynamicContent][" + dynamicContentIndex + "][filters][" + dynamicContentFilterIndex + "][filters][" + filterNum + "]";
    var filterIdBase = "emailform_dynamicContent_" + dynamicContentIndex + "_filters_" + dynamicContentFilterIndex + "_filters_" + filterNum;

    if (isSpecial) {
        var templateField = fieldType;
        if (fieldType == 'boolean') {
            templateField = 'select';
        }
        var template = mQuery('#templates .' + templateField + '-template').clone();
        var $template = mQuery(template);
        var templateNameAttr = $template.attr('name').replace(/__name__/g, filterNum)
            .replace(/__dynamicContentIndex__/g, dynamicContentIndex)
            .replace(/__dynamicContentFilterIndex__/g, dynamicContentFilterIndex);
        var templateIdAttr = $template.attr('id').replace(/__name__/g, filterNum)
            .replace(/__dynamicContentIndex__/g, dynamicContentIndex)
            .replace(/__dynamicContentFilterIndex__/g, dynamicContentFilterIndex);

        $template.attr('name', templateNameAttr);
        $template.attr('id', templateIdAttr);

        prototype.find('input[name="' + filterBase + '[filter]"]').replaceWith(template);
    }

    if (activeDynamicContentFilterContainer.find('.panel').length == 0) {
        // First filter so hide the glue footer
        prototype.find(".panel-footer").addClass('hide');
    }

    prototype.find("input[name='" + filterBase + "[field]']").val(selectedFilter);
    prototype.find("input[name='" + filterBase + "[type]']").val(fieldType);
    prototype.find("input[name='" + filterBase + "[object]']").val(fieldObject);

    var filterEl = (isSpecial) ? "select[name='" + filterBase + "[filter]']" : "input[name='" + filterBase + "[filter]']";

    activeDynamicContentFilterContainer.append(prototype);

    Mautic.initRemoveEvents(activeDynamicContentFilterContainer.find("a.remove-selected"));

    var filter = '#' + filterIdBase + '_filter';

    var fieldOptions = fieldCallback = '';
    //activate fields
    if (isSpecial) {
        if (fieldType == 'select' || fieldType == 'boolean') {
            // Generate the options
            fieldOptions = selectedOption.data("field-list");

            mQuery.each(fieldOptions, function(index, val) {
                mQuery('<option>').val(index).text(val).appendTo(filterEl);
            });
        }
    } else if (fieldType == 'lookup') {
        fieldCallback = selectedOption.data("field-callback");
        if (fieldCallback && typeof Mautic[fieldCallback] == 'function') {
            fieldOptions = selectedOption.data("field-list");
            Mautic[fieldCallback](filterIdBase + '_filter', selectedFilter, fieldOptions);
        }
    } else if (fieldType == 'datetime') {
        mQuery(filter).datetimepicker({
            format: 'Y-m-d H:i',
            lazyInit: true,
            validateOnBlur: false,
            allowBlank: true,
            scrollInput: false
        });
    } else if (fieldType == 'date') {
        mQuery(filter).datetimepicker({
            timepicker: false,
            format: 'Y-m-d',
            lazyInit: true,
            validateOnBlur: false,
            allowBlank: true,
            scrollInput: false,
            closeOnDateSelect: true
        });
    } else if (fieldType == 'time') {
        mQuery(filter).datetimepicker({
            datepicker: false,
            format: 'H:i',
            lazyInit: true,
            validateOnBlur: false,
            allowBlank: true,
            scrollInput: false
        });
    } else if (fieldType == 'lookup_id') {
        //switch the filter and display elements
        var oldFilter = mQuery(filterEl);
        var newDisplay = mQuery(oldFilter).clone();
        mQuery(newDisplay).attr('name', filterBase + '[display]')
            .attr('id', filterIdBase + '_display');

        var oldDisplay = mQuery(prototype).find("input[name='" + filterBase + "[display]']");
        var newFilter = mQuery(oldDisplay).clone();
        mQuery(newFilter).attr('name', filterBase + '[filter]')
            .attr('id', filterIdBase + '_filter');

        mQuery(oldFilter).replaceWith(newFilter);
        mQuery(oldDisplay).replaceWith(newDisplay);

        var fieldCallback = selectedOption.data("field-callback");
        if (fieldCallback && typeof Mautic[fieldCallback] == 'function') {
            fieldOptions = selectedOption.data("field-list");
            Mautic[fieldCallback](filterIdBase + '_display', selectedFilter, fieldOptions);
        }
    } else {
        mQuery(filter).attr('type', fieldType);
    }

    // Remove inapplicable operator types
    var operators = selectedOption.data('field-operators');

    if (typeof operators != "undefined") {
        if (typeof operators.include != 'undefined') {
            mQuery('#' + filterIdBase + '_operator option').filter(function () {
                return mQuery.inArray(mQuery(this).val(), operators['include']) == -1
            }).remove();
        } else if (typeof operators.exclude != 'undefined') {
            mQuery('#' + filterIdBase + '_operator option').filter(function () {
                return mQuery.inArray(mQuery(this).val(), operators['exclude']) !== -1
            }).remove();
        }
    }

    // Convert based on first option in list
    Mautic.convertDynamicContentFilterInput('#' + filterIdBase + '_operator');
};

Mautic.convertDynamicContentFilterInput = function(el) {
    var operator = mQuery(el).val();
    // Extract the filter number
    var regExp    = /emailform_dynamicContent_(\d+)_filters_(\d+)_filters_(\d+)_operator/;
    var matches   = regExp.exec(mQuery(el).attr('id'));

    var dynamicContentIndex       = matches[1];
    var dynamicContentFilterIndex = matches[2];
    var filterNum                 = matches[3];

    var filterId       = '#emailform_dynamicContent_' + dynamicContentIndex + '_filters_' + dynamicContentFilterIndex + '_filters_' + filterNum + '_filter';
    var filterEl       = mQuery(filterId);
    var filterElParent = filterEl.parent();

    // Reset has-error
    if (filterElParent.hasClass('has-error')) {
        filterElParent.find('div.help-block').hide();
        filterElParent.removeClass('has-error');
    }

    var disabled = (operator == 'empty' || operator == '!empty');
    filterEl.prop('disabled', disabled);

    if (disabled) {
        filterEl.val('');
    }

    var newName = '';

    if (filterEl.is('select')) {
        var isMultiple  = filterEl.attr('multiple');
        var multiple    = (operator == 'in' || operator == '!in');
        var placeholder = filterEl.attr('data-placeholder');

        if (multiple && !isMultiple) {
            filterEl.attr('multiple', 'multiple');

            // Update the name
            newName =  filterEl.attr('name') + '[]';
            filterEl.attr('name', newName);

            placeholder = mauticLang['chosenChooseMore'];
        } else if (!multiple && isMultiple) {
            filterEl.removeAttr('multiple');

            // Update the name
            newName =  filterEl.attr('name').replace(/[\[\]']+/g, '');
            filterEl.attr('name', newName);

            placeholder = mauticLang['chosenChooseOne'];
        }

        if (multiple) {
            // Remove empty option
            filterEl.find('option[value=""]').remove();

            // Make sure none are selected
            filterEl.find('option:selected').removeAttr('selected');
        } else {
            // Add empty option
            filterEl.prepend("<option value='' selected></option>");
        }

        // Destroy the chosen and recreate
        if (mQuery(filterId + '_chosen').length) {
            filterEl.chosen('destroy');
        }

        filterEl.attr('data-placeholder', placeholder);

        Mautic.activateChosenSelect(filterEl);
    }
};
