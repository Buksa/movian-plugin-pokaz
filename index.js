// var plugin = JSON.parse(Plugin.manifest);
var page = require('movian/page');
var html = require('movian/html');
var http = require('movian/http'); // Require the http module from movian
// var settings = require('showtime/settings');

var PREFIX = 'pokaz';
var BASE_URL = 'https://pokaz.me';
var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36';

// create service
require('movian/service').create('pokaz', PREFIX + ':start', 'video', true, Plugin.path + 'logo.png');

/**
 * Route handler for the main page of the plugin.
 * @param {Object} page - The page object passed by the Movian framework.
 */
new page.Route(PREFIX + ':start', function(page) {
    page.type = 'directory';
    page.model.contents = 'grid';
    page.metadata.title = PREFIX;
    page.metadata.icon = Plugin.path + 'logo.png';
    page.metadata.logo = Plugin.path + 'logo.png';
    page.loading = true;
    var currentPage = 1;
    var next = '';

    /**
     * The async paginator function to load more items on the page.
     */
    function loadMoreItems() {

        /**
         * The URL to scrape for the current page.
         * @type {String}
         */
        var url = next ? BASE_URL + next : BASE_URL;

        /**
         * Scrapes the given URL and displays the results on the page.
         * @param {Object} page - The page object passed by the Movian framework.
         * @param {String} url - The URL to scrape.
         * @param {Function} displayResults - The callback function to handle the scraped data.
         */
        scrapePage(page, url, function displayResults(data) {
            data.forEach(function(item) {
                /**
                 * Appends an item to the page.
                 * @param {String} url - The URL of the item.
                 * @param {String} type - The type of the item.
                 * @param {Object} metadata - The metadata of the item.
                 */
                page.appendItem(PREFIX + ':play:' + item.href, 'directory', {
                    title: item.title,
                    icon: BASE_URL + item.icon,
                });
            });
            currentPage++;
            next = '/page/' + currentPage + '/';
            page.haveMore(data.endOfData !== undefined && !data.endOfData);
        });
    }
    /**
     * The async paginator function to load more items on the page.
     */
    page.asyncPaginator = loadMoreItems;
    loadMoreItems();
    page.loading = false;
});

/**
 * Route handler for the play page of the plugin to play the specified video content.
 *
 * @function
 * @param {Object} page - The page object to be redirected
 * @param {string} href - The link to the video content
 */
new page.Route(PREFIX + ':play:(.*)', function(page, href) {
    page.loading = true;

    // Make a GET request to the specified URL
    var resp = http.request(BASE_URL + href)

    // Parse the response into a DOM object
    var dom = html.parse(resp).root;

    // Get the 4th script tag in the DOM
    var script = dom.getElementByTagName('script')[4].textContent;

    // Modify the script to only include the var kodk, kos, file
    var js = script.replace('var player=new Playerjs({id:"myTabContent",file:', 'var file=');
    js = js.replace(/,vast:[\s\S]+/g, '');

    // Evaluate the modified script to get var kodk, kos, file
    eval(js);

    // Array of encoded strings key 
    var bk = ["NTU2R0c=", "RDRGRzVG", "UjRSR1IzVg==", "M1NGVkZGMU8=", "MlRGNUQ4WDJOUQ=="];

    // Get the encoded string
    var x = file;

    // Remove the first two characters from the file encoded string
    var a = x.substr(2);

    // Replace the encoded strings (keys) with an empty string
    for (var i = 0; i < bk.length; i++) {
        a = a.replace('F' + bk[i], "");
    }

    // Decode the modified file string, remove the first two characters, and replace the encoded strings again
    a = b2(a).substr(2);
    for (var i = 0; i < bk.length; i++) {
        a = a.replace('F' + bk[i], "");
    }

    // Decode the final result
    a = b2(a);

    // Replace the placeholders with the specified values
    var url = a.replace('{v1}', kodk).replace('{v2}', kos);

    // Redirect the page to the final URL will play file
    page.redirect(url);
});



/**
 * Scrapes a given URL and returns the data contained within it.
 * Extracts and returns the relevant data from a DOM object in callback.
 * @param {object} page - The page object to display error messages on.
 * @param {string} url - The URL to scrape.
 * @param {function} callback - The function to call when scraping is complete.
 * @callback callback
 * @param {Array} returnValue - An array of objects with properties `href`, `title`, and `icon`.
 * @param {boolean} returnValue.endOfData - Indicates if there is more data to be scraped.
 */
function scrapePage(page, url, callback) {
    var headers = {
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'ru-RU,ru;q=0.5',
        'User-Agent': UA
    };
    var options = {
        "debug": true,
        "method": "GET",
        "headers": headers,
    };

    // Make a GET request to the specified URL with the given headers and options
    http.request(url, options, function(err, response) {
        if (err) {
            console.error(err); // Log the error in the console
            if (page) {
                page.error(err); // If a page object was passed, call its error method
            }
            return;
        }
        var dom = html.parse(response).root; // Parse the response as HTML and get the root element
        var elements = dom.getElementById('dle-content').children; // Get the children of the element with id "dle-content"
        // Map the elements to an array of objects with href, title, and icon properties
        var returnValue = elements.map(function(element) {
            if (element.nodeName === 'a') {
                return {
                    href: element.attributes.getNamedItem('href').value,
                    title: element.getElementByTagName('img')[0].attributes.getNamedItem('alt').value,
                    icon: element.getElementByTagName('img')[0].attributes.getNamedItem('src').value,
                };
            }
        });
        // Filter out undefined elements
        returnValue = returnValue.filter(function(element) {
            return element !== undefined;
        });
        // Check if there is a navigation element
        var navigation = dom.getElementByClassName('navigation');
        if (navigation.length) {
            var pages = navigation[0].getElementByClassName('pages')[0].children;
            var lastPage = pages[pages.length - 1];
            // Check if the last page is a link, and set endOfData accordingly
            if (lastPage.nodeName === "a") {
                returnValue.endOfData = false;
            } else returnValue.endOfData = true
        }
        // Call the callback with the scraped data
        callback(returnValue);
    });
}

/**
 * Encodes a string to base64.
 *
 * @param {string} str The string to be encoded.
 * @returns {string} The base64-encoded string.
 */
function b1(str) {
    return Duktape.enc('base64', encodeURIComponent(str));
}

/**
 * Decodes a base64-encoded string.
 *
 * @param {string} str The base64-encoded string.
 * @returns {string} The decoded string.
 */
function b2(str) {
    return decodeURIComponent(Duktape.dec('base64', str));
}