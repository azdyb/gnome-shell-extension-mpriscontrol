const DBus = imports.dbus;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Signals = imports.signals;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Panel = imports.ui.panel;

const Gettext = imports.gettext.domain("gnome-shell");
const _ = Gettext.gettext;

const PLAYBACKSTATUS_UNKNOWN    = "Unknown";
const PLAYBACKSTATUS_STOPPED    = "Stopped";
const PLAYBACKSTATUS_PLAYING    = "Playing";
const PLAYBACKSTATUS_PAUSED     = "Paused";

// TODO: Move to gsettings
const SUPPORTED_PLAYERS = ["rhythmbox", "banshee"];


const DBusPropertiesInterface = {
    name: "org.freedesktop.DBus.Properties",
    signals: [
      { name: "PropertiesChanged", inSignature: "a{sv}" }
    ]
}

function DBusProperties(mpris_player) {
    this._init(mpris_player);
}

DBusProperties.prototype = {
    _init: function(mpris_player) {
        DBus.session.proxifyObject(this, mpris_player, "/org/mpris/MediaPlayer2");
    }
}

DBus.proxifyPrototype(DBusProperties.prototype, DBusPropertiesInterface)


const MprisMediaPlayer2PlayerInterface = {
    name: "org.mpris.MediaPlayer2.Player",
    methods: [
      { name: "PlayPause", inSignature: "", outSignature: "" },
    ],
    properties: [
      { name: "PlaybackStatus", signature: "s", access: "read" },
    ]
};

function MprisMediaPlayer2Player(mpris_player) {
    this._init(mpris_player);
};

MprisMediaPlayer2Player.prototype = {
    _init: function(mpris_player) {
        DBus.session.proxifyObject(this, mpris_player, "/org/mpris/MediaPlayer2");
    }
};

DBus.proxifyPrototype(MprisMediaPlayer2Player.prototype, MprisMediaPlayer2PlayerInterface);


const MprisMediaPlayer2Interface = {
    name: "org.mpris.MediaPlayer2",
    methods: [
      { name: "Raise", inSignature: "", outSignature: "" },
      { name: "Quit", inSignature: "", outSignature: "" },
    ],
    properties: [
      { name: "Identity", signature: "s", access: "read" },
    ]
};

function MprisMediaPlayer2(mpris_player) {
    this._init(mpris_player);
};

MprisMediaPlayer2.prototype = {
    _init: function(mpris_player) {
        DBus.session.proxifyObject(this, mpris_player, "/org/mpris/MediaPlayer2");
    }
};

DBus.proxifyPrototype(MprisMediaPlayer2.prototype, MprisMediaPlayer2Interface);


function Indicator() {
    this._init.apply(this, arguments);
}

Indicator.prototype = {
    __proto__: PanelMenu.SystemStatusButton.prototype,

    discovered_players: [],
    dbus_properties: null,
    mprisplayer2_player: null,
    mprisplayer2: null,
    playback_status:  PLAYBACKSTATUS_UNKNOWN,

    _init: function() {
        PanelMenu.SystemStatusButton.prototype._init.call(this, "media-eject", null);

        this.actor.connect("button-press-event", Lang.bind(this, this.on_button_press));
        
        this.playback_status_changed(PLAYBACKSTATUS_UNKNOWN);

        for each(let p in SUPPORTED_PLAYERS)
            DBus.session.watch_name("org.mpris.MediaPlayer2." + p, false, Lang.bind(this, this.player_appeared), Lang.bind(this, this.player_vanished));
    },
    
    on_button_press: function(sender, event) {
        this.menu.close(false); // Ugly hack
        if (this.mprisplayer2_player) {
            this.mprisplayer2_player.PlayPauseRemote();
            return true;
        }
        return false;
    },
    
    bind_player: function(mpris_player) {
        this.mprisplayer2 = new MprisMediaPlayer2(mpris_player);
        this.mprisplayer2_player = new MprisMediaPlayer2Player(mpris_player);
        this.dbus_properties = new DBusProperties(mpris_player);
        
        this.mprisplayer2_player.GetRemote("PlaybackStatus", Lang.bind(this, function(status) {
           this.playback_status_changed(status); 
        }));
        this.dbus_properties.connect("PropertiesChanged", Lang.bind(this, this.on_propertieschanged));
    },
    
    unbind_player: function() {
        this.mprisplayer2_player = null;
        this.mprisplayer2 = null;
        this.dbus_properties = null;
        this.playback_status_changed(PLAYBACKSTATUS_UNKNOWN);
    },
    
    player_appeared: function(player) {
        this.discovered_players.push(player);
        if (this.mprisplayer2_player == null) { // No player currently bound
            this.bind_player(player);
        }
    },
    
    player_vanished: function(player) {
        let i = this.discovered_players.indexOf(player);
        if (i >= 0) this.discovered_players.splice(i, 1);
        
        if (this.mprisplayer2_player && (player == this.mprisplayer2_player.getBusName())) {
            // Currently bound player vanished. Let's pick another one from the list, if exists...
            if (this.discovered_players.length) {
                this.bind_player(this.discovered_players[0]);
            } else this.unbind_player();
        }
    },
    
    playback_status_changed: function(playback_status) {
        this.playback_status = playback_status;
        if (playback_status == PLAYBACKSTATUS_PAUSED) {
            this.setIcon("media-playback-pause");
            this.actor.show();
        } else if (playback_status == PLAYBACKSTATUS_PLAYING) {
            this.setIcon("media-playback-start");
            this.actor.show();
        } else if (playback_status == PLAYBACKSTATUS_STOPPED) {
            this.setIcon("media-playback-stop");
            this.actor.show();
        } else {
            this.setIcon("media-eject");
            this.actor.hide();
        }
    },
    
    on_propertieschanged: function(sender, iface, properties) {
        if (iface == "org.mpris.MediaPlayer2.Player" && "PlaybackStatus" in properties) {
            this.playback_status_changed(properties["PlaybackStatus"]);
        }
    }
};

function main(meta) {
    Panel.STANDARD_TRAY_ICON_ORDER.unshift("mpriscontrol");
    Panel.STANDARD_TRAY_ICON_SHELL_IMPLEMENTATION["mpriscontrol"] = Indicator;
}
