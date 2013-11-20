MyLCDirective.directive('fadeable', ['$timeout', function ($timeout) {
    var promise = false;
    
    return function (scope, element, attrs) {
        var showDuration = attrs.fadeableDuration || 8000;
        
        element.css('display', 'none');

        scope.$watch(attrs.fadeable, function (value) {
            var isArray = $.isArray(value);

            if (isArray && value.length || !isArray && value) {
                element.fadeIn();
                
                if(showDuration > 0){
                    $timeout.cancel(promise);
                    
                    promise = $timeout(function(){
                        element.fadeOut();
                        
                        promise = false;
                    }, showDuration);
                }
            }
        });
    }
}]);