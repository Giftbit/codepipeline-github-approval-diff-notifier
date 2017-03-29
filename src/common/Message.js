"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * A message that is passed from a Source to the Destinations
 */
var Message = (function () {
    function Message(obj) {
        var _this = this;
        var requiredFields = [
            "subject",
            "fields"
        ];
        for (var _i = 0, requiredFields_1 = requiredFields; _i < requiredFields_1.length; _i++) {
            var field = requiredFields_1[_i];
            if (typeof obj[field] === "undefined") {
                throw new Error("Missing Required Parameter '" + field + "'");
            }
        }
        this.subject = obj.subject;
        this.fields = obj.fields;
        this.metadata = {};
        if (obj.metadata) {
            this.metadata.sourceName = obj.metadata.sourceName;
            this.metadata.sourceIconUrl = obj.metadata.sourceIconUrl;
        }
        this.tags = [];
        if (obj.tags) {
            obj.tags.forEach(function (tag) {
                if (tag.key && tag.value) {
                    _this.tags.push(tag);
                }
            });
        }
    }
    return Message;
}());
exports.Message = Message;
