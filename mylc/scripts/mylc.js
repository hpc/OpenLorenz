// ===============================================================================
// Copyright (c) 2013, Lawrence Livermore National Security, LLC.
// Produced at the Lawrence Livermore National Laboratory.
// Written by Joel Martinez <martinez248@llnl.gov>, et. al.
// LLNL-CODE-640252
//
// This file is part of Lorenz.
//
// This program is free software; you can redistribute it and/or modify it
// under the terms of the GNU General Public License (as published by the
// Free Software Foundation) version 2, dated June 1991.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the IMPLIED WARRANTY OF
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// terms and conditions of the GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software Foundation,
// Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
// ===============================================================================

$(document).ready(function(){
   var $error = $('#unstableError');
   
   $("#portletControls")
      .portletControls({      
         failed: function(event, error){
            var $div = $('<div></div>').prompt();
    
            $div.prompt('error', {
               friendlyError: 'Error rendering portlet controls. Try refreshing the page. If you are developing custom portlets, '+
                              'please make sure your .js file is properly formatted.  If that doesn\'t work please contact the project administrator.',
               technicalError: error,
               location: 'portlet control rendering'
            });
         }
      });
});
