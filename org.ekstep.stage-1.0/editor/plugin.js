/**
 * @author Santhosh Vasabhaktula <santhosh@ilimi.in>
 */
org.ekstep.contenteditor.basePlugin.extend({
    type: "stage",
    thumbnail: undefined,
    onclick: undefined,
    currentObject: undefined,
    canvas: undefined,
    initialize: function() {
        ecEditor.addEventListener("stage:create", this.createStage, this);
        ecEditor.addEventListener("object:modified", this.modified, this);
        ecEditor.addEventListener("stage:modified", this.modified, this);
        ecEditor.addEventListener("object:selected", this.objectSelected, this);
        ecEditor.addEventListener("object:removed", this.objectRemoved, this);
    },
    createStage: function(event, data) {
        ecEditor.instantiatePlugin(this.manifest.id, data);
    },
    newInstance: function() {
        this.onclick = { id: 'stage:select', data: { stageId: this.id } };
        this.ondelete = { id: 'stage:delete', data: { stageId: this.id } };
        this.duplicate = { id: 'stage:duplicate', data: { stageId: this.id } };
        ecEditor.addStage(this);        
        this.attributes = {
            x: 0,
            y: 0,
            w: 720,
            h: 405,
            id: this.id
        };
        this.addConfig('instructions', this.getParam('instructions') || '');
    },
    getOnClick: function() {
        return { id: 'stage:select', data: { stageId: this.id, prevStageId: ecEditor.getCurrentStage().id } };
    },
    setCanvas: function(canvas) {
        this.canvas = canvas;
    },
    addChild: function(plugin) {
        this.children.push(plugin);
        if(plugin.editorObj) {
            this.canvas.add(plugin.editorObj);
            if(plugin.editorObj.selectable) this.canvas.setActiveObject(plugin.editorObj);
            this.setThumbnail();
            ecEditor.dispatchEvent('stage:modified', { id: plugin.id });
        }
    },
    setThumbnail: function() {
        if (org.ekstep.contenteditor.stageManager.contentLoading) {
            this.thumbnail = this.canvas.toDataURL({format: 'jpeg', quality: 0.1});
        }else{
            var stage = ecEditor.getCurrentStage(),
                canvas = stage.canvas;
            html2canvas($('#canvas-wrapper'), {  
                onrendered: function (canvas) {
                    stage.thumbnail = canvas.toDataURL({format: 'jpeg', quality: 0.1});
                    var angScope = ecEditor.getAngularScope();
                    ecEditor.ngSafeApply(angScope);
                }
            });
        }
    },
    updateZIndex: function() {
        var instance = this;
        ecEditor._.forEach(this.children, function(child) {
            if(child.editorObj) {
                child.attributes['z-index'] = instance.canvas.getObjects().indexOf(child.editorObj);
            } else {
                child.attributes['z-index'] = instance.canvas.getObjects().length;
            }
        });
    },
    render: function(canvas) {
        var instance = this;
        org.ekstep.contenteditor.stageManager.clearCanvas(canvas);
        this.children = ecEditor._.sortBy(this.children, [function(o) { return o.getAttribute('z-index'); }]);
        ecEditor._.forEach(this.children, function(plugin) {
            plugin.render(canvas);
        });
        canvas.renderAll();
        ecEditor.dispatchEvent('stage:render:complete', { stageId: this.id });
        if (org.ekstep.contenteditor.stageManager.contentLoading) {
            this.thumbnail = canvas.toDataURL({format: 'jpeg', quality: 0.1});
        }else{
            var instance = this;
            // _.debounce(function() {
                html2canvas($('#canvas-wrapper'), {
                    onrendered: function(canvas) {
                        instance.thumbnail = canvas.toDataURL({ format: 'jpeg', quality: 0.1 });
                        var angScope = ecEditor.getAngularScope();
                        ecEditor.ngSafeApply(angScope);
                    },
                    timeout: 0
                });
            // }, 150, { leading: true });
        }
        ecEditor.refreshStages();
    },
    modified: function(event, data) {
        ecEditor.getCurrentStage().updateZIndex(); 
        ecEditor.getCurrentStage().setThumbnail();
        ecEditor.refreshStages();
    },
    objectSelected: function(event, data) {
        if(!ecEditor._.isUndefined(this.currentObject) && this.currentObject !== data.id) {
            var plugin = ecEditor.getPluginInstance(this.currentObject);
            ecEditor.getCanvas().trigger("selection:cleared", { target: plugin.editorObj });
        }
        this.currentObject = data.id;
    },
    objectRemoved: function(event, data) {
        this.currentObject = undefined;
    },
    destroyOnLoad: function(childCount, canvas, cb) {
        var instance = this;
        if(childCount == instance.children.length) {
            canvas.clear();
            instance.render(canvas);
            $('#' + instance.id).remove();
            cb();
        } else {
            /* istanbul ignore next. Difficult to test */
            setTimeout(function() {
                instance.destroyOnLoad(childCount, canvas, cb);
            }, 1000);
        }
    },
    getConfigManifest: function() {
        return this.manifest.editor.configManifest;
    },
    getConfig: function() {
        var config = this._super();
        config.genieControls = ecEditor.getAngularScope().showGenieControls;
        return config;
    },
    onConfigChange: function(key, value) {
        switch (key) {
            case "instructions":
                this.addParam('instructions', value);
                break;
            case "genieControls":
                if(value !== ecEditor.getAngularScope().showGenieControls) {
                    var angScope = ecEditor.getAngularScope();
                    ecEditor.ngSafeApply(angScope, function() {
                        angScope.toggleGenieControl();
                    });
                }
                break;
        }
    },
    updateThumbnail: function() {
        $('<canvas>').attr({ id: this.id }).css({ width: '720px', height: '405px' }).appendTo('#thumbnailCanvasContainer');
        canvas = new fabric.Canvas(this.id, { backgroundColor: "#FFFFFF", preserveObjectStacking: true, width: 720, height: 405 });
        this.render(canvas);
        ecEditor.jQuery('#' + this.id).remove();
    }
});
//# sourceURL=stageplugin.js