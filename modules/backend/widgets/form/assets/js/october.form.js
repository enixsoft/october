/*
 * Form Widget
 *
 * Dependences:
 * - Nil
 */
+function ($) { "use strict";
    var Base = $.oc.foundation.base,
        BaseProto = Base.prototype

    var FormWidget = function (element, options) {
        this.$el = $(element)
        this.options = options || {}

        /*
         * Throttle dependency updating
         */
        this.dependantUpdateInterval = 300
        this.dependantUpdateTimers = {}

        $.oc.foundation.controlUtils.markDisposable(element)
        Base.call(this)
        this.init()
    }

    FormWidget.prototype = Object.create(BaseProto)
    FormWidget.prototype.constructor = FormWidget

    FormWidget.prototype.init = function() {

        this.$form = this.$el.closest('form')

        this.bindDependants()
        this.bindCheckboxlist()
        this.toggleEmptyTabs()
        this.bindCollapsibleSections()
        this.bindEvents()

        this.$el.one('dispose-control', this.proxy(this.dispose))
    }

    FormWidget.prototype.dispose = function() {
        this.$el.off('dispose-control', this.proxy(this.dispose))
        this.$el.removeData('oc.formwidget')

        this.$el = null
        this.options = null

        BaseProto.dispose.call(this)
    }

    FormWidget.prototype.bindEvents = function() {
        var self = this

        // Update tab visibility status after fields toggle (deferred)
        this.$el.on('oc.triggerOn.afterUpdate', function() {
            self.toggleEmptyTabs(true)
        })
    }

    /*
     * Logic for checkboxlist
     */
    FormWidget.prototype.bindCheckboxlist = function() {

        var checkAllBoxes = function($field, flag) {
            $('input[type=checkbox]', $field)
                .prop('checked', flag)
                .first()
                .trigger('change')
        }

        this.$el.on('click', '[data-field-checkboxlist-all]', function() {
            checkAllBoxes($(this).closest('.field-checkboxlist'), true)
        })

        this.$el.on('click', '[data-field-checkboxlist-none]', function() {
            checkAllBoxes($(this).closest('.field-checkboxlist'), false)
        })

    }

    /*
     * Bind dependant fields
     */
    FormWidget.prototype.bindDependants = function() {
        var self = this,
            form = this.$el,
            fieldMap = {}

        /*
         * Map master and slave fields
         */
        form.find('[data-field-depends]').each(function() {
            var name = $(this).data('field-name'),
                depends = $(this).data('field-depends')

            $.each(depends, function(index, depend){
                if (!fieldMap[depend])
                    fieldMap[depend] = { fields: [] }

                fieldMap[depend].fields.push(name)
            })
        })

        /*
         * When a master is updated, refresh its slaves
         */
        $.each(fieldMap, function(fieldName, toRefresh){
            form
                .find('[data-field-name="'+fieldName+'"]')
                .on('change.oc.formwidget', $.proxy(self.onRefreshDependants, self, fieldName, toRefresh))
        })
    }

    /*
     * Refresh a dependancy field
     * Uses a throttle to prevent duplicate calls and click spamming
     */
    FormWidget.prototype.onRefreshDependants = function(fieldName, toRefresh) {
        var self = this,
            form = this.$el,
            formEl = this.$form

        if (this.dependantUpdateTimers[fieldName] !== undefined) {
            window.clearTimeout(this.dependantUpdateTimers[fieldName])
        }

        this.dependantUpdateTimers[fieldName] = window.setTimeout(function() {
            formEl.request(self.options.refreshHandler, {
                data: toRefresh
            }).success(function() {
                self.toggleEmptyTabs()
            })
        }, this.dependantUpdateInterval)

        $.each(toRefresh.fields, function(index, field) {
            form.find('[data-field-name="'+field+'"]:visible')
                .addClass('loading-indicator-container size-form-field')
                .loadIndicator()
        })
    }

    /*
     * Hides tabs that have no content
     * - deferred - boolean to defer the action (only one effective call per execution cycle)
     */
    FormWidget.prototype.toggleEmptyTabs = function(deferred) {
        if(deferred) {
            var self = this

            if(this.$$toggleEmptyTabsTimeout) {
                clearTimeout(this.$$toggleEmptyTabsTimeout)
            }

            this.$$toggleEmptyTabsTimeout = setTimeout(function() {
                self.toggleEmptyTabs(false)
                delete self.$$toggleEmptyTabsTimeout
            }, 1);
        } else {
            var tabControl = $('[data-control=tab]', this.$el)

            if (!tabControl.length)
                return

            $('.tab-pane', tabControl).each(function() {
                $('[data-target="#' + $(this).attr('id') + '"]', tabControl)
                    .toggle(!!$('.form-group:not(:empty):not(.hide)', $(this)).length)
            })
        }
    }

    /*
     * Makes sections collapsible by targeting every field after
     * up until the next section
     */
    FormWidget.prototype.bindCollapsibleSections = function() {
        $('.section-field[data-field-collapsible]', this.$form)
            .addClass('collapsed')
            .find('.field-section:first')
                .addClass('is-collapsible')
                .end()
            .on('click', function() {
                $(this)
                    .toggleClass('collapsed')
                    .nextUntil('.section-field').toggle()
            })
            .nextUntil('.section-field').hide()
    }

    FormWidget.DEFAULTS = {
        refreshHandler: null
    }

    // FORM WIDGET PLUGIN DEFINITION
    // ============================

    var old = $.fn.formWidget

    $.fn.formWidget = function (option) {
        var args = arguments,
            result

        this.each(function () {
            var $this   = $(this)
            var data    = $this.data('oc.formwidget')
            var options = $.extend({}, FormWidget.DEFAULTS, $this.data(), typeof option == 'object' && option)
            if (!data) $this.data('oc.formwidget', (data = new FormWidget(this, options)))
            if (typeof option == 'string') result = data[option].call($this)
            if (typeof result != 'undefined') return false
        })

        return result ? result : this
      }

    $.fn.formWidget.Constructor = FormWidget

    // FORM WIDGET NO CONFLICT
    // =================

    $.fn.formWidget.noConflict = function () {
        $.fn.formWidget = old
        return this
    }

    // FORM WIDGET DATA-API
    // ==============

    $(document).render(function() {
        $('[data-control="formwidget"]').formWidget();
    })

}(window.jQuery);