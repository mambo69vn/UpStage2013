/*
Copyright (C) 2003-2006 Douglas Bagnall (douglas * paradise-net-nz)

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
*/

import upstage.util.Icon;
import upstage.Client;
import upstage.util.LoadTracker;
//import upstage.util.Construct;
//import flash.external.ExternalInterface;


/**
 * Prototype for other things
 *
 * Modified by: Heath Behrens & Vibhu Patel 08/08/2011 - Modified function Added line which calls Construct
 *                                                       to scale the prop on stage
 * Modified by: Craig Farrell (CF) 08/04/2013 - added: checks the size of prop and resizes it to the correct size for the stage when loaded
 * Modified by: David Daniels & Lisa Helm 27/08/2013 - Merged in Martins fork
 * Modified by: Nitkalya Wiriyanuparb  29/08/2013  - Modify avatar streaming code and add setVolumeAccordingToMuteStatus() to mute/unmute
 *                                                 - Support mute/unmute globally and locally
 * Modified by: Nitkalya Wiriyanuparb  05/09/2013  - Removed video avatar code
 * Modified by: Nitkalya Wiriyanuparb  10/09/2013  - Added correct Prop resizing in loadImage()
 * Modified by: Takuma and Vanessa 4/06/2013       - isMutedLocally is set to true by defalut.
 */
class upstage.thing.Thing extends MovieClip
{
    var ID                :Number;
    var url               :String;
    var name              :String;
    var medium            :String;
    var thumbnail         :String;
    var wrap_ID           :String;
    var icon              :Icon;       // Mini icon

    public var  image        :MovieClip; //points to the currently showing image
    private var baseLayer    :Number;
    private var layerOffset  :Number;
    private var baseName     :String;

    private static var symbolName:String = "__Packages.upstage.thing.Thing";
    private static var symbolLinked:Boolean = Object.registerClass(symbolName, Thing);

    static var LAYER: Number = Client.L_PROPS_IMG;

	// streaming properties
	
	public var videodisplay : MovieClip;	// videodisplay (carries video)
    public var video : Video;				// video itself
	public var streamName : String;			// name of the stream, e.g. 'red5StreamDemo'
	public var streamServer : String;		// url of the stream server, e.g. 'rtmp://localhost/oflaDemo'
	private var connection:NetConnection;	// the network connection to the stream server
	private var stream:NetStream;			// the network stream of a connected stream server
    // Mute and unmute live stream avatar - Ing - 28/8/13
    // FIXME all of streaming related stuff should not be in Thing.as, maybe Avatar.as
    public var isMutedGlobally :Boolean;
    public var isMutedLocally :Boolean;
    private var soundStream :Sound;

    /**
     * @brief Constructor
     * Initialise the object
     */

    static public function factory(ID :Number, name :String, url :String, baseName: String,
                                   thumbnail :String, medium :String, layer: Number,
                                   parent:MovieClip, Class: Object, streamserver :String, streamname :String) : Thing
    {
        if (!Class || ! Class.symbolName){
            trace("no class in Thing constructor");
            Class = Thing;
        }
        var mc:MovieClip = parent.attachMovie(Class.symbolName, baseName, layer);
        var thing:Thing = Thing(mc);
        thing.baseLayer = layer;
        thing.baseName = baseName;
        thing.ID = ID;
        thing.url = url;// + '?r=' + Math.random(); //cache busting.
        thing.name = name;
        thing.medium = medium;
        thing.streamName = streamname;
        thing.streamServer = streamserver;
        thing.isMutedLocally = true;    
        thing.isMutedGlobally = false;

        if (medium == 'stream') {
        	thing.streamInit();
        }
        thing.thumbnail = thumbnail;
        thing._visible = false;
        
        return thing;
    }

    /* 
    *
    * load the initial image
    * Modified by: Heath / Vibhu 08/08/2011 - Added to scale the prop on stage.
    *
    */

    function loadImage(url : String, layer: Number, listener: Object, swfwidth: Number, swfheight: Number)
    {
        // Ing - add correct prop resizing
        if (!listener){
            var thing: Thing = this;
            listener = LoadTracker.getLoadListener();
            listener.onLoadInit = function(mc: MovieClip){
                if (swfwidth && swfheight) {
                    mc._width = swfwidth / Client.SCREEN_SIZE_DIVISOR;
                    mc._height = swfheight / Client.SCREEN_SIZE_DIVISOR;
                }
                thing.image = mc;
                thing.finalise();
            };
        }
        LoadTracker.loadImage(this, url, layer, listener);
    }


    /**
     * @brief finalise.
     * Called when the things are all loaded.
     */
    public function finalise(){
        //trace("finalising thing " + this.name);
    }

	function streamInit() {
		trace("in Thing.streamInit");
		
		// prepare streaming
		
		// TODO distinguish between live stream, vod stream (flv), mp3 stream, etc ... and set thumbnail icon overlay (using font awesome) according to type
		
		// attach videodisplay from library (height is calculated for aspect ratio of 4:3)
		this.videodisplay = this.attachMovie("VideoDisplay", "videodisplay", this.baseLayer, {_x:0, _y:0, _width:Client.AVATAR_MAX_WIDTH, _height:(((Client.AVATAR_MAX_WIDTH)/4)*3)});
	}

    /**
     * @brief Show the thing
     */
    function show() :Void
    {
        trace("thing.show with" + this);
        
        this._alpha = 100;
        this._visible = true;
        // set up stream only if not already setup
        if (this.medium == 'stream' && this.connection == null) {
        	trace("medium stream recognized");
        	
        	// start stream
        	
        	// for reference see http://docs.brajeshwar.com/as2/NetStream.html
        	
        	// hide avatar image?
        	//this.image._visible = false;
        	
        	// create connection to server if parameter is given
			this.connection = new NetConnection();
			if(this.streamServer == '') {
				this.connection.connect(null);
			} else {
				if(!this.connection.isConnected) this.connection.connect(this.streamServer);	
			}
			
			// TODO distinguish between live stream, vod stream (flv), mp3 stream, etc ...
			
			// (re-)connect stream
			this.stream = new NetStream(this.connection);
			this.stream.setBufferTime(Client.STREAM_BUFFER_TIME);
			
			this.video = this.videodisplay.video;
			this.video.clear();
			
			// attach video to display
			this.video.attachVideo(this.stream);
		
			// start playing
			//this.stream.play(this.streamName, -1);	// did not work playing flv files
			this.stream.play(this.streamName);

            var sound:MovieClip = this.videodisplay.createEmptyMovieClip("sound",this.videodisplay.getNextHighestDepth());
            sound.attachAudio(this.stream);
            this.soundStream = new Sound(sound);
            this.setVolumeAccordingToLocalMuteStatus();

			// handle events
			
			var thing:Thing = this;	// get reference to thing (needed for handling events)
			
			// metadata for playing streamed flv
			// see: http://docs.brajeshwar.com/as2/NetStream.html#event:onMetaData
			this.stream.onMetaData = function(infoObj:Object) {
				trace("NetStream.onMetaData called: (" + getTimer() + " ms)");
			    for (var propName:String in infoObj) {
			        trace("MetaData >> " + propName + " = " + infoObj[propName]);
			    }
			};
			
			// status events
			// see: http://docs.brajeshwar.com/as2/NetStream.html#event:onStatus
			this.stream.onStatus = function(infoObj:Object) {
				
				// log all events
				trace("NetStream.onStatus called: (" + getTimer() + " ms)");
        		for (var prop:String in infoObj) {
            		trace("Status >> " + prop + ": " + infoObj[prop]);
        		}
				
				// handle events
				switch (infoObj.code) {
					
					// TODO still needs more testing: switching resolution, publish/unpublish, etc.
					
					//case 'NetStream.Play.PublishNotify':
					//case 'NetStream.Play.Start':
					case 'NetStream.Buffer.Full':
						// resize avatar layer properly (video width or height might be 0! => revert to default)
						trace('current videostream size is ' + thing.video.width + 'x' + thing.video.height);
						if(thing.video.width == 0 || thing.video.height == 0) {
							thing.video._width = Client.STREAM_DEFAULT_WIDTH;
							thing.video._height = Client.STREAM_DEFAULT_HEIGHT;
						} else {
							thing.video._width = thing.video.width;
							thing.video._height = thing.video.height;	
						}
						thing.videodisplay._visible = true;
						//thing.image._visible = false;		// TODO hide overlay image?
						break;
					
					case 'NetStream.Play.UnpublishNotify':
					case 'NetStream.Play.Stop':
					//case 'NetStream.Buffer.Empty':
						// clear the stream
						trace('clear stream');
						thing.video.clear();
						thing.videodisplay._visible = false;
						//thing.image._visible = true;		// TODO show overlay image?
						break;
					
					case 'NetStream.Play.StreamNotFound':
						trace('error: stream "' + this.streamName + '" not found on ' + this.streamServer);
						break;
				}
				
			}
        	
        }
    };

	/**
 	 * @brief Hide the thing
 	 */
    function hide() :Void
    {
        trace("thing.hide with " + this);
        
        if (this.medium == 'stream') {
        	trace("hiding video stream");
        	
        	// stop video	
        	
        	// show avatar image?
        	//this.image._visible = true;
        	
        	// close stream + connection
			this.stream.close();
			if(this.connection.isConnected) this.connection.close();
			
			// clear video
			this.video.clear();
            this.connection = null;
        }
        
        this._visible = false;
        //Construct.deepTrace(this);
    };

    /**
     * @brief Set the thing's position on stage
     */
    function setPosition(x :Number, y :Number, z :Number) :Void
    {
        //trace("setting thing position to " + x + "," + y + " now:" + this._x + "," + this._y);
        this._x = x - (this.image._width * 0.5);
        this._y = y - (this.image._height * 0.5);
    };

    // FIXME should not be in Thing.as, move to Avatar.as?
    function setVolumeAccordingToLocalMuteStatus() {
        var newVolume:Number = isMutedLocally ? 0 : 100;
        this.soundStream.setVolume(newVolume);
        // ExternalInterface.call("alert", "Audio, isMute = " + this.isMutedLocally + ", newVol = " + newVolume + ", realVol = " + this.soundStream.getVolume());
    }

    function Thing(){};
};