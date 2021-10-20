sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("gmriskproposal.controller.Worklist", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
        onInit: function () {
            var oViewModel,
                iOriginalBusyDelay;

            // Put down worklist table's original value for busy indicator delay,
            // so it can be restored later on. Busy handling on the table is
            // taken care of by the table itself.
            // keeps the search state
            this._aTableSearchState = [];

            // Model used to manipulate control states
            oViewModel = new JSONModel({
                worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
                shareOnJamTitle: this.getResourceBundle().getText("worklistTitle"),
                shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
                shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
                tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
                tableBusyDelay: 0
            });
            this.setModel(oViewModel, "worklistView");

            // Make sure, busy indication is showing immediately so there is no
            // break after the busy indication for loading the view's meta data is
            // ended (see promise 'oWhenMetadataIsLoaded' in AppController)
            this.setModel(new JSONModel({
                impacts: [],
                causes: []
            }), "saveModel");

            this.setModel(new JSONModel({
                impacts: [{
                    impactId: "1",
                    impactText: "Impact 1"
                }, {
                    impactId: "2",
                    impactText: "Impact 2"
                }],
                causes: [{
                    causeId: "1",
                    causeText: "Cause 1"
                }, {
                    causeId: "2",
                    causeText: "Cause 2"
                }]
            }), "dropdowns");
        },

        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        goToPrevPage: function () {
            this.byId("proposeRiskWizard").previousStep();
            this.byId("prevPageAction").setVisible(false);
            this.byId("nextPageAction").setVisible(true);
        },

        goToNextPage: function () {
            this.byId("proposeRiskWizard").nextStep();
            this.byId("nextPageAction").setVisible(false);
            this.byId("prevPageAction").setVisible(true);
        },

        handleStepActivate: function (oEvent) {

        },



		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
        onUpdateFinished: function (oEvent) {
            // update the worklist's object counter after the table update
            var sTitle,
                oTable = oEvent.getSource(),
                iTotalItems = oEvent.getParameter("total");
            // only update the counter if the length is final and
            // the table is not empty
            if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
                sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
            } else {
                sTitle = this.getResourceBundle().getText("worklistTableTitle");
            }
            this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
        },

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
        onPress: function (oEvent) {
            // The source is the list item that got pressed
            this._showObject(oEvent.getSource());
        },

		/**
		 * Event handler for navigating back.
		 * We navigate back in the browser history
		 * @public
		 */
        onNavBack: function () {
            // eslint-disable-next-line sap-no-history-manipulation
            history.go(-1);
        },


        onSearch: function (oEvent) {
            if (oEvent.getParameters().refreshButtonPressed) {
                // Search field's 'refresh' button has been pressed.
                // This is visible if you select any master list item.
                // In this case no new search is triggered, we only
                // refresh the list binding.
                this.onRefresh();
            } else {
                var aTableSearchState = [];
                var sQuery = oEvent.getParameter("query");

                if (sQuery && sQuery.length > 0) {
                    aTableSearchState = [new Filter("CategoryID", FilterOperator.Contains, sQuery)];
                }
                this._applySearch(aTableSearchState);
            }

        },

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
        onRefresh: function () {
            var oTable = this.byId("table");
            oTable.getBinding("items").refresh();
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        handleAddCauses: function () {
            // open popup
            if (!this.causesPopup) {
                this.causesPopup = new sap.m.SelectDialog({
                    title: "Select a Cause",
                    confirm: function (oEvent) {
                        var aContexts = oEvent.getParameter("selectedContexts");
                        var mObject = aContexts[0].getObject();
                        var oModel = this.getView().getModel("saveModel");
                        var aData = oModel.getData();
                        aData.causes.push({ "causeText": mObject.causeText });
                        oModel.setData(aData);
                        oModel.refresh();
                    }.bind(this)
                });
                this.causesPopup.bindAggregation("items", {
                    path: "dropdowns>/causes",
                    template: new sap.m.StandardListItem({
                        title: "{dropdowns>causeText}"
                    })
                });
                this.getView().addDependent(this.causesPopup);
            }
            this.causesPopup.open();
        },

        handleAddImpacts: function () {
            if (!this.impactsPopup) {
                this.impactsPopup = new sap.m.SelectDialog({
                    title: "Select an Impact",
                    confirm: function (oEvent) {
                        var aContexts = oEvent.getParameter("selectedContexts");
                        var mObject = aContexts[0].getObject();
                        var oModel = this.getView().getModel("saveModel");
                        var aData = oModel.getData();
                        aData.causes.push({ "impactText": mObject.impactText });
                        oModel.setData(aData);
                        oModel.refresh();
                    }.bind(this)
                });
                this.impactsPopup.bindAggregation("items", {
                    path: "dropdowns>/impacts",
                    template: new sap.m.StandardListItem({
                        title: "{dropdowns>impactText}"
                    })
                });
                this.getView().addDependent(this.impactsPopup);
            }
            this.impactsPopup.open();
        },
		/**
		 * Shows the selected item on the object page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
        _showObject: function (oItem) {
            this.getRouter().navTo("object", {
                objectId: oItem.getBindingContext().getProperty("CategoryID")
            });
        },

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
		 * @private
		 */
        _applySearch: function (aTableSearchState) {
            var oTable = this.byId("table"),
                oViewModel = this.getModel("worklistView");
            oTable.getBinding("items").filter(aTableSearchState, "Application");
            // changes the noDataText of the list in case there are no filter results
            if (aTableSearchState.length !== 0) {
                oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
            }
        }

    });
});