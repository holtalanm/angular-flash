/*! angular-flash - v2.2.5 - 2016-03-17
 * https://github.com/sachinchoolur/angular-flash
 * Copyright (c) 2016 Sachin; Licensed MIT */

'use strict';

var defaultFlashScope = 'default-flash';
const app = angular.module('ngFlash', []);

app.run(['$rootScope', function ($rootScope) {
    return $rootScope.flashes = {};
}]);

app.directive('dynamic', ['$compile', function ($compile) {
    return {
        restrict: 'A',
        replace: true,
        link: function link(scope, ele, attrs) {
            return scope.$watch(attrs.dynamic, function (html) {
                ele.html(html);
                return $compile(ele.contents())(scope);
            });
        }
    };
}]);

app.directive('closeFlash', ['$compile', '$rootScope', 'Flash', function ($compile, $rootScope, Flash) {
    return {
        link: function link(scope, ele, attrs) {
            return ele.on('click', function () {
                var id = parseInt(attrs.closeFlash, 10);
                Flash.dismiss(id);
                $rootScope.$apply();
            });
        }
    };
}]);

app.directive('flashMessage', ['Flash', function (Flash) {
    return {
        restrict: 'E',
        scope: {
            duration: '=',
            showClose: '=',
            flashScope: '@?',
            onDismiss: '&'
        },
        template: '<div role="alert" ng-repeat="flash in $root.flashes[flashScope] track by $index" id="{{flash.config.id}}" class="alert {{flash.config.class}} alert-{{flash.type}} alert-dismissible alertIn alertOut"><div type="button" class="close" ng-show="flash.showClose" close-flash="{{flash.id}}"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></div> <span dynamic="flash.text"></span> </div>',
        link: function link(scope, ele, attrs) {
            scope.flashScope = angular.isUndefined(scope.flashScope) || scope.flashScope == defaultFlashScope ? defaultFlashScope : scope.flashScope;
            var flashFact = Flash.getScope(scope.flashScope);
            flashFact.setDefaultTimeout(scope.duration);
            flashFact.setShowClose(scope.showClose);
            function onDismiss(flash) {
                if (typeof scope.onDismiss !== 'function') return;
                scope.onDismiss({ flash: flash });
            }

            flashFact.setOnDismiss(onDismiss);
        }
    };
}]);

app.factory('Flash', ['$rootScope', '$timeout', function ($rootScope, $timeout) {
    var scopedDataFactory = {
        scopes: {}
    };
    var counter = 0;

    scopedDataFactory.getScope = function getFlashScope(flashScope) {
        if(!flashScope) flashScope = defaultFlashScope;
        if(scopedDataFactory.scopes[flashScope]) return scopedDataFactory.scopes[flashScope];
        var dataFactory = {};

        $rootScope.flashes[flashScope] = [];

        dataFactory.setDefaultTimeout = function (timeout) {
            if (typeof timeout !== 'number') return;
            dataFactory.defaultTimeout = timeout;
        };

        dataFactory.defaultShowClose = true;
        dataFactory.setShowClose = function (value) {
            if (typeof value !== 'boolean') return;
            dataFactory.defaultShowClose = value;
        };
        dataFactory.setOnDismiss = function (callback) {
            if (typeof callback !== 'function') return;
            dataFactory.onDismiss = callback;
        };
        dataFactory.create = function (type, text, timeout, config, showClose) {
            var $this = undefined,
                flash = undefined;
            $this = this;
            flash = {
                flashScope: flashScope,
                type: type,
                text: text,
                config: config,
                id: counter++
            };
            flash.showClose = typeof showClose !== 'undefined' ? showClose : dataFactory.defaultShowClose;
            if (dataFactory.defaultTimeout && typeof timeout === 'undefined') {
                flash.timeout = dataFactory.defaultTimeout;
            } else if (timeout) {
                flash.timeout = timeout;
            }
            $rootScope.flashes[flashScope].push(flash);
            if (flash.timeout) {
                flash.timeoutObj = $timeout(function () {
                    $this.dismiss(flash.id);
                }, flash.timeout);
            }
            return flash.id;
        };
        dataFactory.pause = function (index) {
            if ($rootScope.flashes[flashScope][index].timeoutObj) {
                $timeout.cancel($rootScope.flashes[flashScope][index].timeoutObj);
            }
        };
        dataFactory.dismiss = function (id) {
            var index = findIndexById(id);
            if (index !== -1) {
                var flash = $rootScope.flashes[flashScope][index];
                dataFactory.pause(index);
                $rootScope.flashes[flashScope].splice(index, 1);
                if (typeof dataFactory.onDismiss === 'function') {
                    dataFactory.onDismiss(flash);
                }
            }
        };
        dataFactory.clear = function () {
            while ($rootScope.flashes[flashScope].length > 0) {
                dataFactory.dismiss($rootScope.flashes[flashScope][0].id);
            }
        };
        dataFactory.reset = dataFactory.clear;
        function findIndexById(id) {
            return $rootScope.flashes[flashScope].map(function(flash) {
                return flash.id;
            }).indexOf(id);
        }

        function hasId(id) {
            return $rootScope.flashes[flashScope].map(function(flash) {
                return flash.id;
            }).map(function(flashId) {
                return flashId == id;
            }).reduce(function(prev, curr, currIdx, arr) {
                return prev || curr;
            }, false);
        }
        dataFactory.hasId = hasId;
        dataFactory.flashScope = flashScope;

        scopedDataFactory.scopes[flashScope] = dataFactory;

        return dataFactory;
    };

    function findScopeById(id) {
        return Object.keys(scopedDataFactory.scopes).filter(function (key) {
            return scopedDataFactory.scopes[key].hasId(id);
        }).map(function (key) {
            return scopedDataFactory.scopes[key].flashScope;
        }).reduce(function(prev, curr, currIdx, arr) {
            return prev == defaultFlashScope ? curr : prev;
        }, defaultFlashScope);
    }

    scopedDataFactory.dismiss = function dismiss(id) {
        var flashScope = findScopeById(id);
        scopedDataFactory.scopes[flashScope].dismiss(id);
    }

    scopedDataFactory.getScope(defaultFlashScope);

    scopedDataFactory.setDefaultTimeout = function defaultScopeSetDefaultTimeout(timeout) {
        scopedDataFactory.getScope(defaultFlashScope).setDefaultTimeout(timeout);
    };

    scopedDataFactory.setShowClose = function defaultScopeSetShowClose(showClose) {
        scopedDataFactory.getScope(defaultFlashScope).setShowClose(showClose);
    };

    scopedDataFactory.setOnDismiss = function defaultScopeSetOnDismiss(onDismiss) {
        scopedDataFactory.getScope(defaultFlashScope).setOnDismiss(onDismiss);
    };

    scopedDataFactory.create = function defaultScopeCreate(type, text, timeout, config, showClose) {
        scopedDataFactory.getScope(defaultFlashScope).create(type, text, timeout, config, showClose);
    };

    scopedDataFactory.pause = function defaultScopePause(index) {
        scopedDataFactory.getScope(defaultFlashScope).pause(index);
    };

    scopedDataFactory.clear = function defaultScopeClear() {
        scopedDataFactory.getScope(defaultFlashScope).clear();
    };

    scopedDataFactory.reset = function defaultScopeReset() {
        scopedDataFactory.getScope(defaultFlashScope).reset();
    };

    return scopedDataFactory;
}]);
//# sourceMappingURL=angular-flash.js.map
