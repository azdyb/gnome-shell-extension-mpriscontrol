const Main = imports.ui.main;
const St = imports.gi.St;
const DBus = imports.dbus;
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Clutter = imports.gi.Clutter;

const Gettext = imports.gettext.domain("gnome-shell");
const _ = Gettext.gettext;

const PLAYBACKSTATUS_UNKNOWN    = "Unknown";
const PLAYBACKSTATUS_STOPPED    = "Stopped";
const PLAYBACKSTATUS_PLAYING    = "Playing";
const PLAYBACKSTATUS_PAUSED     = "Paused";

// TODO: Move to gsettings
const SUPPORTED_PLAYERS = ["rhythmbox", "nuvolaplayer", "banshee"];
const HIDE_DISCONNECTED = true;


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
        { name: "Previous", inSignature: "", outSignature: "" },
        { name: "PlayPause", inSignature: "", outSignature: "" },
        { name: "Next", inSignature: "", outSignature: "" },
    ],
    properties: [
    { name: "Metadata", signature: "a{sv}", access: "read" },
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


function PopupIconMenuItem() {
    this._init.apply(this, arguments);
}

PopupIconMenuItem.prototype = {
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,

    _init: function (iconName, params) {
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this, params);

        this._icon = new St.Icon({ style_class: "popup-menu-icon" });
        this.addActor(this._icon, { align: St.Align.MIDDLE });

        this.setIcon(iconName);
    },

    setIcon: function(name) {
        this._icon.icon_name = name;
    }
};


function MprisIndicator() {
    this._init.apply(this, arguments);
}

MprisIndicator.prototype = {
    __proto__: PanelMenu.SystemStatusButton.prototype,

    discovered_players: [],
    dbus_properties: null,
    mprisplayer2_player: null,
    mprisplayer2: null,
    playback_status: PLAYBACKSTATUS_UNKNOWN,

    _init: function() {
        PanelMenu.SystemStatusButton.prototype._init.call(this, "media-eject", null);

        this.actor.connect("button-press-event", Lang.bind(this, this.on_indicator_buttonpress));
        this.actor.connect("scroll-event", Lang.bind(this, this.on_indicator_scroll));
        
        this.menu_playback = new St.BoxLayout({name: "playbackControls"});
        this.menu.addActor(this.menu_playback);

        this.menu_playback_buttons = {
            "previous": new PopupIconMenuItem("media-skip-backward"),
            "playpause": new PopupIconMenuItem("media-playback-pause"),
            "next": new PopupIconMenuItem("media-skip-forward")
        }
        
        this.menu_playback_buttons.previous.connect("activate", Lang.bind(this, this.on_previous_clicked));
        this.menu_playback_buttons.playpause.connect("activate", Lang.bind(this, this.on_playpause_clicked));
        this.menu_playback_buttons.next.connect("activate", Lang.bind(this, this.on_next_clicked));
        
        this.menu_playback.add(this.menu_playback_buttons.previous.actor, { expand: true, x_fill: false, x_align: St.Align.START });
        this.menu_playback.add(this.menu_playback_buttons.playpause.actor, { expand: true, x_fill: false, x_align: St.Align.MIDDLE });
        this.menu_playback.add(this.menu_playback_buttons.next.actor, { expand: true, x_fill: false, x_align: St.Align.END });

        this.menu_player = new PopupMenu.PopupMenuItem("", { reactive: true, style_class: "menu-player" });
        this.menu_player.connect("activate", Lang.bind(this, this.on_playermenu_clicked));
        this.menu.addMenuItem(this.menu_player);

        this.unbind_player();

        for each(let p in SUPPORTED_PLAYERS)
            DBus.session.watch_name("org.mpris.MediaPlayer2." + p, false, Lang.bind(this, this.player_appeared), Lang.bind(this, this.player_vanished));
    },
    
    on_previous_clicked: function() {
        if (this.mprisplayer2_player)
            this.mprisplayer2_player.PreviousRemote();
    },
    
    on_playpause_clicked: function() {
        if (this.mprisplayer2_player)
            this.mprisplayer2_player.PlayPauseRemote();
    },
    
    on_next_clicked: function() {
        if (this.mprisplayer2_player)
            this.mprisplayer2_player.NextRemote();
    },
    
    on_indicator_buttonpress: function(sender, event) {
        if ( (event.get_button() == 2) && this.mprisplayer2_player) {
            this.menu.close(false); // Ugly hack
            this.mprisplayer2_player.PlayPauseRemote();
            return true;
        }
        return false;
    },
    
    on_indicator_scroll: function(actor, event) { 
        let direction = event.get_scroll_direction();
        
        if(this.mprisplayer2_player){
            switch(direction){
                case Clutter.ScrollDirection.DOWN:
                    this.mprisplayer2_player.PreviousRemote();
                    break;
                case Clutter.ScrollDirection.UP:
                    this.mprisplayer2_player.NextRemote();
                    break;
            }
        }
    },
    
    on_playermenu_clicked: function() {
        if (this.mprisplayer2) this.mprisplayer2.RaiseRemote();
    },
    
    on_player_propertieschanged: function(properties) {
        if ("Identity" in properties)
            this.menu_player.label.set_text(properties["Identity"]);
        if ("CanRaise" in properties)
            this.menu_player.actor.reactive = properties["CanRaise"];
    },
    
    on_playback_propertieschanged: function(properties) {
        if ("PlaybackStatus" in properties)
            this.playback_status_changed(properties["PlaybackStatus"]);
        if (("CanPlay" in properties) || ("CanPause" in properties))
            this.menu_playback_buttons.playpause.actor.reactive = (properties["CanPlay"] || properties["CanPause"]);
        if ("CanGoPrevious" in properties)
            this.menu_playback_buttons.previous.actor.reactive = properties["CanGoPrevious"];
        if ("CanGoNext" in properties)
            this.menu_playback_buttons.next.actor.reactive = properties["CanGoNext"];
    },
    
    bind_player: function(mpris_player) {
        this.mprisplayer2 = new MprisMediaPlayer2(mpris_player);
        this.mprisplayer2_player = new MprisMediaPlayer2Player(mpris_player);
        this.dbus_properties = new DBusProperties(mpris_player);
        
        this.mprisplayer2.GetAllRemote(Lang.bind(this, this.on_player_propertieschanged));
        this.mprisplayer2_player.GetAllRemote(Lang.bind(this, this.on_playback_propertieschanged));
        
        this.dbus_properties.connect("PropertiesChanged", Lang.bind(this, function(sender, iface, properties) {
            if (iface == "org.mpris.MediaPlayer2.Player") {
                this.on_playback_propertieschanged(properties);
            } else if (iface == "org.mpris.MediaPlayer2") {
                this.on_player_propertieschanged(properties);
            }
        }));
        this.menu_playback.show();
    },
    
    unbind_player: function() {
        this.mprisplayer2_player = null;
        this.mprisplayer2 = null;
        this.dbus_properties = null;
        this.menu_playback.hide();
        this.playback_status_changed(PLAYBACKSTATUS_UNKNOWN);
    },
    
    player_appeared: function(player) {
        if (this.discovered_players.indexOf(player) < 0) this.discovered_players.push(player);
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
            this.menu_playback_buttons.playpause.setIcon("media-playback-start");
            this.actor.show();
        } else if (playback_status == PLAYBACKSTATUS_PLAYING) {
            this.setIcon("media-playback-start");
            this.menu_playback_buttons.playpause.setIcon("media-playback-pause");
            this.actor.show();
        } else if (playback_status == PLAYBACKSTATUS_STOPPED) {
            this.setIcon("media-playback-stop");
            this.menu_playback_buttons.playpause.setIcon("media-playback-start");
            this.actor.show();
        } else {
            for each (let b in this.menu_playback_buttons) {
                b.actor.reactive = false;
            }
            this.setIcon("media-eject");
            this.menu_playback_buttons.playpause.setIcon("media-playback-start");
            this.menu_player.label.set_text(_("No player found"));
            this.menu_player.actor.reactive = false;
            if (HIDE_DISCONNECTED) this.actor.hide();
        }
    }
};

function enable() {
    let children = Main.panel._rightBox.get_children();
    for (let i = children.length - 1; i >= 0; --i) {
        if(Main.panel._statusArea["volume"] == children[i]._delegate) {
            Main.panel.addToStatusArea("mpriscontrol", new MprisIndicator(), children[i]._rolePosition);
        }
    }
}

function disable() {
    let children = Main.panel._rightBox.get_children();
    for (let i = children.length - 1; i >= 0; --i) {
        if(Main.panel._statusArea["mpriscontrol"] == children[i]._delegate){
            Main.panel._rightBox.get_children()[i].destroy();
            break;
        }
    }
    
    Main.panel._statusArea["mpriscontrol"] = null;
}

function init(extensionMeta) {
}
