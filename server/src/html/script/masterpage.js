/**
 * Script controlling Masterpage functions.
 * 
 * @Author Shaun Narayan
 * @note
 * @history
 * @Version 0.3 Shaun Narayan (Initial)
 * 			0.4 Shaun Narayan (05/12/10) - Fixed login cookie check being executed multiple times.
 *
 *			Modified by: Vibhu Patel / Heath Behrens - 12/08/2011
 							-Created a call back function which calls to set cookie with the username as a parameter
 							-edited set cookie to include a path which is the root path so now it reads =path=/; so that
 							the cookie is avaliable on all webpages
 			Modified by Vibhu Patel / Heath Behrens (19/08/2011)
 							-Modified fill page which fixes numerous bugs in filtering and scrolling through media
 			Modified by Vibhu Patel (20/08/2011)
 							-Modified so it shows message if media was deleted by another user.
 			Modified by Vibhu, Nessa, Heath 26/08/2011 - Added media tagging to building the request.
 * 								                       - All element tags are sent to the server as one comma separated string.
 *			Modified by Vibhu / Heath (01/09/2011) - Modified fillpage() to call applyTags to ensure tags searches are applied.	
 *			
 *			Modified by Daniel (27/06/2012) - to Allow multiple selects on Select tags.			
 *
 *			Modified by Daniel (03/07/2012)	- Removed usernameUpStage cookie as it is not very safe.
 *											- using temporary cookies[username,password] to get session state working and remove cookie	straight after checking them.
 
 *          Modified by Daniel Gavin (22/08/2012)	- Modified postback message to be more visible to users when users save a stage. 
 *											
 *          Modified by Daniel        (29/08/2012)  - Added isLoggedIn method and navHome() and navStages() checks if user is logged in. 
                                                        and if so, page is redirected to /admin/home or /admin/stages 
            Modified by Scott         (10/10/2012)  -Added navHomeUser() method, so when the user logs out it redirects to /home instead of /admin/home  
            Modified by Scott/Craig/Gavin   (10/10/2012) -Added embsMessage method to embbed the stage save success message into stageedit.xhtml 
            Modified by Gavin (6/3/2013): Changed actions[type] to actions[5] to also delete the media on warn(type) function. 
            Modified by Craig Farrell (09/04/2013)  - changed back to actions[type] so all the stageEdit buttens work again
                                                    - changed embedmessage method name so it is more understandable. called it seSaveOnly();
            Modified by Gavin (16/4/2013): Made a conditional statement to display the correct media warning message and delete the media.   
            Modified by Gavin (28/5/2013): Made a navAdmin() function to replace the navWorkshop() function when the user logs in 
                                          - Added a conditional statement to navWorkshop() for different links depending if the user is logged in or not, changed the link location of navWorkshop() to /home instead of /admin to fix the workshop login issue.  
            Modified by Vanessa (28/08/2013): Merged Martins fork of code to working copy
            Modified by Nitkalya (3/9/2013): Fix confusing "save and reload stage" message
            Modified by Nitkalya (4/9/2013): Edit clear stage warning message as clients requested
            Modified by Nitkalya (14/9/2013): Make player/audience stat info clearer, and fix issues when it displays NaN audiences on some pages
            Modified by Lisa (24/09/2013): Added code to provide different home page for guests and users
            Modified by Nitkalya (25/09/2013): Added methods to remove and create workshop link dynamically using javascript
            Modified by Nitkalya (09/10/2013): Fixed login issues, login links on admin page, and added autofocus on username text box
            Modified by Nitkalya (17/10/2013): Added showAlertBox(), hidePopup() and modified popup message box, so it's centered, and dismissible using the Enter key
            Modified by Nitkalya (17/10/2013): Refactored buildRequest methods to move away from using form number, and added enterPressed and shiftEnterPressed
            Modified by Nitkalya (17/10/2013): Used the alert box with shaded background to preview media on stage edit page
 */

//Instance type variables
var loginForm;
var colorPicker;
var xmlhttp;
var screenW;
var screenH;
var cookieChecked = false;

//Static variables
var signup = '<a href="javascript:navSignup()">Request an Account</a> or ';
var loginLinks= '<a href="javascript:login()">Sign In</a>';
var signup_html = '<a href="javascript:navSignup();">Dont have an account? Find out how to get involved.</a>';
var warningMessages = ['This will reload the stage for all players and audience currently on it. Do you wish to proceed?',
                       'You will lose any chages you have made. Do you wish to proceed?',
                       'This will delete the selected stage. Do you wish to proceed?',
                       'Warning: This will clear the chat log and any drawings from the stage, and the stage will reload for all players and audience on it. Do you wish to proceed?',
                       'Any changes you have made will be saved, overwriting prevoius settings. Do you wish to proceed?',
                       'This stage will be permanently deleted. Do you wish to proceed? (This will not delete any media that has been assigned to this stage.)',
                       'This will save the stage, losing any previous settings without reloading the stage. Do you wish to proceed?',
                       'This media item will be permanently deleted. Do you wish to proceed?"'
                       ]
var actions = ['save', 'cancel', 'delete', 'reset', 'save', 'delete', 'saveonly']; //Dont really need these, just makes server code more readable.

/**
 * Initialization.
 */
function init()
{
	requestPage("GET", "/admin/perspective-init?username=&password=&submit=Login", checkWebpageLogin);
}

function countPlayerAndAudience()
{
	var elements = document.getElementById('playerAudience').getElementsByTagName('tr');
	var playerCount = new Number(0);;
	var audCount = new Number(0);;
	for(i in elements)
	{
		try
		{
			var e1 = elements[i].getElementsByTagName('td');
			var pl = e1[2].innerHTML;
			var au = e1[3].innerHTML;
			if(pl != null)
			{
				pl = trim(pl);
			}
			if(au != null)
			{
				au = trim(au);
			}
			if(pl != null && pl.length > 0)
			{
				var x = parseInt(pl);
				playerCount = playerCount + x;
			}
			if(au != null && au.length > 0)
			{
				var y = parseInt(au);
				audCount = audCount + y;
			}
		}
		catch(ex){}
	}
}

// Removes leading and ending whitespaces
// see: http://blog.stevenlevithan.com/archives/faster-trim-javascript
function trim(value) {
	//return value.replace(/^\s+|\s+$/g, '');
	return value.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}

/**
 * Adds onkeydown event handler
 * if the enter key is pressed
 * invoke the passed function
 * Ing - 17/10/2013
 */
function enterPressed(el, fn)
{
	el.onkeydown = function (event) { 
		if (event.keyCode == 13){//} && this == document.activeElement) {
			// pass on the 3rd (or more) ... parameters to the fn function
			fn(Array.prototype.slice.call(arguments, 2));
		}
	}
}

/**
 * Adds onkeydown event handler
 * if the enter key is pressed while holding the shift key
 * invoke the passed function
 * Ing - 17/10/2013
 */
function shiftEnterPressed(el, fn)
{
	el.onkeydown = function (event) { 
		if (event.keyCode == 13 && event.shiftKey){//} && this == document.activeElement) {
			// pass on the 3rd (or more) ... parameters to the fn function
			fn(Array.prototype.slice.call(arguments, 2));
		}
	}
}

//--------------------------------------
function checkWebpageLogin()
{
	if (xmlhttp.readyState==4)
  	{
		if(xmlhttp.responseText.length > 0)
		{
			navHome();
		}
		else
		{
			cookieChecked = true;
			navWorkshop();
		}
  	}
}

function temp_getCookie(c_name)
	{
	var i,x,y,ARRcookies=document.cookie.split(";");
	for (i=0;i<ARRcookies.length;i++)
	  {
	  x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
	  y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
	  x=x.replace(/^\s+|\s+$/g,"");
	  if (x==c_name)
		{
		return unescape(y);
		}
	  }
	}
	/**
	*	Added by: Vibhu Patel / Heath Behrens - 12/08/2011
	*				-Creates a cookie named usernameUpStage which contains the persons username
	*				-Calls set cookie function
	*
	*/
	function callSetCookie()
	{
		var userInfo = document.hidden_form.user_name.value;
		var passInfo = document.hidden_form.server_details.value;
		var value = userInfo + "=" + passInfo;
		//call to set cookie
		//setCookie("usernameUpStage", value, 0, 1);
	}

// Ing - Use javascript to dynamically create and remove workshop nav link
/**
 * Create workshop link on nav bar for users
 */
function createWorkshopLink()
{
	var workshopLink = document.getElementById('workshop-link');
    if (!workshopLink && (document.getElementById('nav') !== null)) {
    	workshopLink = document.createElement('a');
    	workshopLink.href = "javascript:navWorkshop()";
    	workshopLink.text = "WORKSHOP";
    	workshopLink.parentNode.insertBefore(workshopLink, document.getElementById('stage-link'));
    }
}

/**
 * Remove workshop link after user has logged out
 */
function removeWorkshopLink()
{
	var workshopLink = document.getElementById('workshop-link');
    if (workshopLink && document.URL.indexOf('admin/save') < 0)
    	workshopLink.parentNode.removeChild(workshopLink);
}

/**
 * For dynamic section of master page, check if the server has authenticated,
 * if so welcome the user else keep the form.
 */
function clearLogin()
{
	screenSize();
	
	try
	{
		var loggedInPlayer = document.hidden_form.user_name.value;
		
		if(loggedInPlayer=='_NO_PLAYER_')
		{
			var usernameCookie=temp_getCookie("usernameUpStage");
			if(usernameCookie != null && usernameCookie!="")
			{
				var temp1 = new Array();
				temp1 = usernameCookie.split('=');
				document.hidden_form.user_name.value = temp1[0];
			}
			else
			{
				if(!cookieChecked) checkCookie();
				loginForm = document.getElementById('signup').innerHTML;
				var html_str;
				if (document.URL.indexOf('admin/save') >= 0)
				{	// success and error page doesn't contains player info, but users are logged in
					html_str = '';
				}
				else if(document.hidden_form.can_signup.value=='true')
				{
					html_str=signup+loginLinks;
				}
				else
				{
					html_str=loginLinks;
				}
				document.getElementById('signup').innerHTML = html_str;
                removeWorkshopLink();
			}
		}
		else
		{
			/* serverInfo is the number of players and audience logged in, separted by a '#' */
			var serverInfo = document.hidden_form.server_details.value;
			var temp = new Array();
			temp = serverInfo.split('#');
			document.getElementById('signup').innerHTML = 'Welcome back, ' +loggedInPlayer +'!<br/><a href="javascript:logout();">logout</a><br /><br /><strong>Currently on Stages</strong><br />Registered Players : ' + temp[0] + '<br />Guest Audiences : ' + temp[1];
            createWorkshopLink();
		}
	}
	catch(ex)
	{
		alert(ex);
	}
}

/**
 * Invert the colors for the selected link in workshop nav.
 * @param set - Which link has been selected
 * @return none
 */
function invertNav(set)
{
	document.getElementById(set+'link').style.backgroundColor = "#000000";
	document.getElementById(set+'link').style.color = "#FFFFFF";
}

function screenSize()
{	
	if (navigator.appName.indexOf("Microsoft")!=-1) 
	{
	    screenW = document.documentElement.clientWidth;
	    screenH = document.documentElement.clientHeight;
	}
	else 
	{
		screenW = window.innerWidth;
		screenH = window.innerHeight;
	}
}
/*
 * Navigation functions. Not strictly required now
 * but will be for ajax (if implemented).
 */
 
 /*
    Daniel Han (29/08/2012) - Checking if user is logged in by checking hidden_form.user_name value.
                            - Don't use this as a final user check.
 */
 function isLoggedIn()
 {
    try
    {
        return document.hidden_form.user_name.value != "_NO_PLAYER_" || document.URL.indexOf('admin/save') >= 0;
    }catch(err){ return false; }
 }
 
function navHome()
{
    if(isLoggedIn())
    {
        window.location = '/admin/home';
        createWorkshopLink();
    }
    else
    {
        window.location = '/home';
        removeWorkshopLink();
    }
}

function navHomeUser()
{
    if(isLoggedIn())
    {
        window.location = '/home';
    }
    else
        window.location = '/home';
}
 /*
    Gavin Chan (28/05/2013) - Created a navAdmin function so the website can redirect  
            to the admin page when they are logged in instead of using the workshop link
 */
function navAdmin()
{
    {
        window.location = '/admin';
    }   
}

function navWorkshop()
{
	if(isLoggedIn())
    {
        window.location = '/admin';
    }
    else
        window.location = '/home';
}

function navStages()
{
    if(isLoggedIn())
    {
        window.location = '/admin/stages';
    }
    else
        window.location = '/stages';
}

function navSignup()
{
	window.location = '/signup';
}

function openStage(id)
{
    window.location = '/stages/' + id;
}

function login()
{
	// first time that the user tries to login (never reaches woven's guard realm before) - then init session
	// requesting the perspective-init page without a session cookie will init the session
	if (document.cookie.indexOf("woven_session") === -1) {
		requestPage("GET", '/admin/perspective-init', null);
	}

	if(document.hidden_form.can_signup.value=='true')
	{
		loginForm += signup_html;
	}
	document.getElementById('signup').innerHTML = loginForm;
	document.getElementById('username').focus();
}

function navStageWorkshop()
{
	window.location = '/admin/workshop/stage';
}

function navMediaUpWorkshop()
{
	window.location = '/admin/workshop/mediaupload';
}

function navMediaEditWorkshop()
{
	window.location = '/admin/workshop/mediaedit';
}

function navUserPage()
{
	window.location = '/admin/workshop/user';
}
/**
 * Delete cookies and reset the login form.
 * @return none
 */
function logout()
{
	// not deleting woven session cookie anymore, the guard realm needs it
	// the cookie does not contain anything about users' credentials
	var cookies = document.cookie.split(";");
	for (var i = 0 ; i < cookies.length; i++){
		deleteCookie(cookies[i].split("=")[0]);
	}
	// delete username and password cookies ('remember me' was checked)
	//deleteCookie('username');
	//deleteCookie('password');

	requestPage("GET", '/admin/perspective-destroy', null);
	document.getElementById('signup').innerHTML = loginLinks;
	window.location = '/home';
}

/**
 * Saves a cookie.
 * Modified by: Heath Behrens / Vibhu Patel 12/08/2011 
 *				- sets a cookie within the browser with the parameters namely added path=/ (the root path) 
 *				 so that the cookie is avaliable on all pages. 
 * Modified by: Daniel Han 03/07/2012 - Added Hour
 * @param c_name - Name to index by
 * @param value - Value to save.
 * @param expiredays - Days before cookie should be deleted.
 * @param hour	     - Hour before cookie expires
 * @return none
 */
function setCookie(c_name,value, expiredays, hour)
{
	var exdate=new Date();
	exdate.setDate(exdate.getDate()+expiredays);
	exdate.setHours(exdate.getHours() + hour);
	document.cookie=c_name+ "=" +escape(value)+((expiredays==null) ? "" : ";path=/;expires="+exdate.toGMTString());
	var num=document.cookie.indexOf("usernameUpStage" + "=");
	
}

/**
* Delete the cookie within the browser
*/
function deleteCookie(c_name)
{
 	document.cookie = c_name + "=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT";
	document.cookie = c_name + "=;path=/admin/;expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

function getCookie(c_name)
{
	if (document.cookie.length>0)
	{
		var c_start=document.cookie.indexOf(c_name + "=");
		if (c_start!=-1)
		{
			c_start=c_start + c_name.length+1;
			var c_end=document.cookie.indexOf(";",c_start);
			if (c_end==-1) c_end=document.cookie.length;
			return unescape(document.cookie.substring(c_start,c_end));
		}
	}
	return "";
}

function checkCookie()
{
	var uname =getCookie('username');
	if (uname!=null && uname!="")
	{
		var password = getCookie('password');
		requestPage("POST", '/admin/perspective-init?username='+uname+'&password='+password+'&submit=Login', checkLogin);
	}
}

function setPassword(name,pass)
{
	name = name.toLowerCase();
	var md5val = hex_md5(pass);
	if(document.login.remember.checked)
	{
		setCookie('username',name,30,0);
		setCookie('password',md5val,30,0);
	}
	//setCookie('tempUser', name, 0, 1);
	//setCookie('tempPass', md5val, 0, 1);
	requestPage("POST", "/admin/perspective-init?username="+unescape(name)+"&password="+md5val+"&submit=Login", checkLogin);
}

/**
 * AJAX functions.
 */
function requestPage(method,page,onReady)
{
	xmlhttp=GetXmlHttpObject();
	if (xmlhttp==null)
  	{
  		alert ("Your browser does not support XMLHTTP!");
  		return;
  	}
	var url=page;
	//url=url+"&sid="+Math.random(); //Ensures no page caching
	//xmlhttp.onreadystatechange=onReady;
	xmlhttp.open(method,url,true);
	xmlhttp.onreadystatechange=onReady;
	xmlhttp.send();
}

 function requestInfo(method,page,onReady)
 {
 	xmlhttp=GetXmlHttpObject();
 	if (xmlhttp==null)
   	{
   		alert ("Your browser does not support XMLHTTP!");
   		return;
   	}
 	var url=page;
 	//url=url+"&sid="+Math.random(); //Ensures no page caching
 	xmlhttp.onreadystatechange=onReady;
 	xmlhttp.open(method,url,true);
 	xmlhttp.send(null);
 } 
 
 function requestPageForm(method,page,actform,onReady)
 {
    xmlhttp=GetXmlHttpObject();
	if (xmlhttp==null)
  	{
  		alert ("Your browser does not support XMLHTTP!");
  		return;
  	}
	var url=page;

    var formStr = "";
    
    for (var i = 0; i < actform.elements.length; i++)
    {
        var element = actform.elements[i];
        if(trim(element.name) == "")
        {
            // if element has no name
            continue;
        }
        else if((element.type == "radio" || element.type == "checkbox") && !element.checked)
        {
            // if element is radio button or checkbox but not checked... then continue..
            continue;
        }
        else if(element.value == "")
        {
            continue;
        }
        if(formStr.length > 0)
                formStr += "&";
        formStr += element.name + "=" + element.value;
        
    }
    
	xmlhttp.open(method,url,true);
    xmlhttp.setRequestHeader("Content-type",actform.enctype);
	xmlhttp.onreadystatechange=onReady;
	xmlhttp.send(formStr);
 }

/**
 * Show a popup message box with a custom message
 * and a function to execute after the button is dismissed
 * Ing - 17/10/2013
 */
function showAlertBox(message, buttonAction)
{
	document.getElementById("divPopup").style.display = 'inline-block';
    document.getElementById("divShade").style.display = 'block';
    if (message && message !== '') {
	    document.getElementById("alertMsg").innerHTML = message;
	}

    var button = document.getElementById("alertBtn");
    if (buttonAction && typeof buttonAction == "function") {
	    button.onclick = function(event) { hidePopup(); buttonAction(); };
	}
    button.focus(); // just press enter to dismiss the popup
}

function checkLogin()
{
	if (xmlhttp.readyState==4)
  	{
		if(xmlhttp.responseText.substring(0,5) =='<?xml')//HACK until woven gaurds are replaced.
		{
			var html = '<h1>Authentication Failed</h1><p>Login Failed. Please enter correct login details.</p>';
			html += '<p>You will be redirected to the homepage in 3 seconds...</p>';	//
			document.getElementById("page").innerHTML = html;				// PR - 9/10/2010

			// delete 'remember me' cookies since we've failed authentication
			deleteCookie('username');
			deleteCookie('password');

			window.setTimeout('location.reload(true)', 3000);
		}
		else
		{
            // Modified: Daniel Han (29/08/2012) Checking /admin/id to confirm login.
            //requestPage("POST", "/admin/id", checkSessionLogin);
            //Modified: Gavin Chan (28/05/2013) Changed to implement navAdmin() function instead of navWorkshop()
            navAdmin();
		}
  	}
}

function checkSessionLogin()
{
	if (xmlhttp.status == 200 && xmlhttp.readyState == 4)
  	{
        // Modified: Daniel Han (29/08/2012) Checking /admin/id to confirm login.
        // player=admin&canAdmin=True&canAct=True&canSu=True&key=834013b601f517024bd0137c238acc33
        var text = xmlhttp.responseText;
        var arr = text.split("&");
        
        for(var param in arr)
        {
            var data = arr[param].split("=");
            if(data[0] == "player")
            {
                if(data[1] == "nice+visitor")
                {
                    // User is not logged in
                    // Nothing to do here~
                }
                else
                {
                    // User successfully logged in
                    clearLogin();
                }
                break;
            }
        }
  	}
}

/**
* Function called to fill the web page with the appropriate elements.
* Modified by Vibhu Patel / Heath Behrens (19/08/2011): 
*							Added breaks to split the page as part of the fix for scrolling
* 							through images in the media, which would not remember the last postion 
*							scrolled too.
* Modified by Vibhu (31/08/2011): 
*							Modified so media list is also updated on the page.
*							Modified so breaking tags are also added to the inner html, so on next request page doesn't break.
*							Modified so after updating list updates previous location rather than starting from begining.
* Modified by Vibhu / Heath (01/09/2011):
*							Modified to call search tag function when media list is updated.
*/
function fillPage()
{
	if(xmlhttp.readyState==4)
	{
		document.getElementById("status").style.display = "none";
		document.getElementById("status").innerHTML = "";
        
		if(document.title != 'Workshop - Media') // probably the stage edit page
		{
            try
            {
            	// reset alert box if it was used to preview media
        		document.getElementById('popup').className = "";

                var temp = (xmlhttp.responseText).split('<!--remove-->');

                document.getElementById("page").innerHTML = temp[1];
                stageEdit();
                restoreState();

                var reply = trim(document.getElementById('successMsg').innerHTML);

                if (reply != '') {
	                showAlertBox(reply);

					if (reply.indexOf('form') !== -1) {
						// hide the form behind the popup
						document.getElementById('successMsg').style.display = "none";
						document.getElementById('name').focus();
						enterPressed(document.getElementById('urlname'), stageChooseSubmit, true);
					} else {
						// auto clear the message at the top after 5 seconds
						setTimeout(function () {
							document.getElementById('successMsg').innerHTML = "";
						}, 5000);
					}
	            } else {
	            	hidePopup();

	            	// if previewing media
	            	var preBox = document.getElementById('editStageMediaPreview'),
	            		preview = trim(preBox.innerHTML);

	            	if (preview != '') {
	            		showAlertBox(preview);
	            		preBox.style.display = "none";
	            		document.getElementById('popup').className = "preview";
	            	} else {
	            		preBox.style.display = "inherit"; // reset
	            	}
	            }

                if(reply.indexOf("deleted") > 0)
                {
                    navStageWorkshop();
                }
            }
            catch(ex){}
            
		}
		//Call to remove the footer from the response page so that the footer is not duplicated.
		//Heath Behrens & Mohammed 07-05-2011
		var d1 = document.getElementById("page");
		var d2 = document.getElementById("footer");
		try
		{
			d1.removeChild(d2);
		}
		catch(ex)
		{}
		
        if(xmlhttp.status == 500)
        {
            hideElementById("divShade");
        }
        
		//-------------------------------------------------------
		
	}
}

function hideElementById(div)
{
    document.getElementById(div).style.display = 'none';
}

function hidePopup()
{
	hideElementById('divPopup');
	hideElementById('divShade');
}

function GetXmlHttpObject()
{
	if (window.XMLHttpRequest)
  	{
  		// code for IE7+, Firefox, Chrome, Opera, Safari
  		return new XMLHttpRequest();
  	}
	if (window.ActiveXObject)
  	{
  		// code for IE6, IE5
  		return new ActiveXObject("Microsoft.XMLHTTP");
 	}
	return null;
}


/**
 * Eventually will replace buildRequest (using form number)
 * Might switch to using ID, but use the form name for now
 * Ing - 17/10/2013
 */
function buildRequestByFormName(formName)
{
	return buildRequestFromForm(document[formName]);
}

/**
 * Build a query string using the inputs from the specified form.
 *
 * Vibhu, Nessa, Heath 26/08/2011 - Added media tagging to building the request.
 * 								  - All element tags are sent to the server as one comma separated string.	
 * @param formNum - where the form appears in the DOM tree.
 * @return str - query string to send over XMLHTTP(AJAX)
 */
function buildRequest(formNum)
{
	// FIXME WTF!?!!!1!! this looks like some ugly tight coupling - are you serious?
	// FIXME selection of values by their element id or name seems rather insecure, any change on the element names will break things!
	// FIXME better break down to separate functions: reading values and creating the request string? 
	// FIXME values are not checked for validity ('undefined') - results are vague and can not be determined ...

	log.debug("buildRequest() start: formNum=" + formNum);

	return buildRequestFromForm(document.forms[formNum]);
}

function buildRequestFromForm(formElement)
{
	var search = ['input','select','textarea'];
	var str = '?';
	for(i in search)
	{
		var elements = formElement.getElementsByTagName(search[i]);
		for(e in elements)
		{
			if(elements[e].name == 'assigned' || elements[e].name == 'unassigned')
			{
				log.debug("A: Element name is 'assigned' or 'unassigned'");
				
				str += elements[e].name + '=';
				var ele = elements[e].getElementsByTagName("option");
				for(j in ele)
				{
					if(ele[j].value != null)
					{
						str += ele[j].value + ',';
						
						log.debug("A: Added value to request: " + ele[j].value);
					}
				}
				str += '&';
			}
			else
			{
				// FIXME better choose url path or unique identification for page, otherwise a change of the document.title will break things!
				if(document.title == 'Workshop - Media')
				{
					log.debug("B: Document title is 'Workshop - Media'");
					
					if(elements[e].name == "tags")
					{
						log.debug("B1: Element name is 'tags'");
						
						str += elements[e].name + '=';
						if(elements[e].value != null)
						{
							str += elements[e].value + ',';
							
							log.debug("B1: Adding value to request: " + elements[e].value);
							
						}
						var ele = document.getElementById("tagDiv").getElementsByTagName("a");
						
						log.debug("B2: Element #tagDiv <a> is " + ele);
						
						for(var k in ele)
						{
							if(ele[k].innerHTML != null)
							{
								if(trim(ele[k].title).length > 0 && ele[k].innerHTML.length > 0)
								{
									str += ele[k].title + ',';
								
									log.debug("B2: Adding to value to request: " + ele[k].title);
								}
							}
						}
						str += '&';
					}
					else
					{
						log.debug("B3: Element name is not 'tags'");
						log.debug("B3: Adding key value pair: " + elements[e].name + '=' + elements[e].value);
						
						str += elements[e].name + '=' + elements[e].value + '&';
					}
				}
				else
				{
					log.debug("C: Document title is not 'Workshop - Media'");
					
					/*
					Modified by Daniel 27/06/2012
						- To handle multiples of Selects
					*/
					if(search[i] == "select")
					{
						log.debug("C1: Found: <select>");

                        for(num = 0; num < elements[e].length; num++)
                        {
                            if(elements[e][num] != null && elements[e][num].selected) {
                              
                            	log.debug("C1: Adding key value pair: " + elements[e].name + '=' + elements[e][num].value);
                            	
                            	str += elements[e].name + '=' + elements[e][num].value + '&';
                            }
                        }

					}
					else
					{
						log.debug("C2: Not found: <select>");
						log.debug("C2: Adding key value pair: " + elements[e].name + '=' + elements[e].value);
						
						str += elements[e].name + '=' + elements[e].value + '&';
					}
				}
			}
		}
	}
	
	log.debug("buildRequest(): created string: " + str);
	
	return str;
}
/**
 * Display warning to user and submit form based on selection.
 * @param type - What to warn about; indexes warning list.
 * @return - none
 */
function warn(type)
{
	doIt=confirm(warningMessages[type]);
	if(doIt)
	{
		// Vibhu and Karena (09/08/2011): Deselects selected media.
		if(type == 5)
		{
			mediaSelected = false;
		}
        // Gavin (16/4/13): Displays warning message of deleting media and also deletes the media
        if(type == 7)
        {
            mediaSelected = false;
            type = 5;
        }
        // Gavin (6/3/13): Changed actions[type] to actions[5] to also delete the media 
		document.getElementById("status").innerHTML = 'Sending to server, please wait...';
		document.getElementById("status").style.display = "inline";
		document.stageedit.action.value = actions[type];// 09/04/2013 Craig - changed back to type so all the stageEdit buttens work again
		requestPage("POST", buildRequest(2),fillPage);
		//18/05/2011 Navigates back to stage workshop page (Vibhu Patel)
        /*
		if(type == 2)
		{
			navStageWorkshop();
		}
        */
	}
}

function seSaveOnly() //09/04/2013 Craig - changed embedmessage method name so it is more understandable
{
    
    document.stageedit.action.value = actions[6];
    requestPage("POST", buildRequest(2),fillPage);
     
}

//==========================================================================
//Old Methods
//==========================================================================

// FIXME if these functions are old, why not remove them? or are they still in use?
// FIXME obviously this function is still in use: see master_a.inc

/**
 * PQ: 14/09/07 - Edit Macromedia links etc to Adobe.
 * javascript code to detect a flash plugin.
 * @return
 */
function test_flash(){
  var mm = '<a href="http://www.adobe.com/go/getflashplayer">Adobe</a>.';
  
  var messages = {
      ok       : '',  //say nothing
      old      : '<b>Your Flash plugin is too old. You will need to download a new version from ' + mm + '</b>',
      broken   : '<b>Your Flash plugin is oddly configured. You may need to reinstall it, or download a new one from ' + mm + '</b>',
      absent   : '<b>You will need a Flash player from ' + mm + ' to use UpStage</b>'
  }
      
  var np = navigator.plugins; 
  if (np && np.length && np["Shockwave Flash"]){
      var fp = np["Shockwave Flash"];
      var f = 0;
      for (var n=0; n < fp.length; n++){
          var m = fp[n];
          f |= (m && m.enabledPlugin && 
                (m.suffixes.indexOf("swf") != -1) && 
                navigator.mimeTypes["application/x-shockwave-flash"] != null);
      }
      if (f){
          var ws = fp.description.split(" ");
          for (var w in ws){
              var v = parseInt(ws[w]);
              if (v){
                  //document.write("Has Flash version "+ v);
                  if (v >= 8){   
                      document.write(messages.ok);
                  }
                  else{ 
                      document.write(messages.old);
                  }
              }
          }
      }
      else{
          document.write(messages.broken);
      }
  }
  else {
        // Daniel Han 21/09/2012 - Added activeX check for IEs
        var flashObj = null;
        try { flashObj = new ActiveXObject('ShockwaveFlash.ShockwaveFlash'); } catch (ex) { document.write(messages.absent); }
        if (flashObj != null) {
            var fV;
            try { fV = flashObj.GetVariable("$version"); } catch (err) { document.write(messages.absent); }
            v = fV.replace(/^.*?([0-9]+,[0-9]+).*$/, '$1').split(',');
            if(v[0] >= 8)
            {
                document.write(messages.ok);
            }
            else
            {
                document.write(messages.old);
            }
        }
        else{
            document.write(messages.absent);
        }
    }
  
}
