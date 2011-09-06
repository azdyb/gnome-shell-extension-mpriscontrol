What is MprisControl?
=====================

MprisControl is a gnome-shell extension that allows controling any MPRIS_
compliant player with (literally) one click. The extension places an icon
on gnome-shell Main Panel which indicates playback status of currently running
media player. Clicking the icon toggles play/pause. And that's it! No other
functionality is implemented, nor is planned.

.. _MPRIS: http://www.mpris.org/


What it looks like?
===================

Everybody loves screenshots, right?

Playing:

.. image:: http://img402.imageshack.us/img402/9325/mpriscontrolplaying.png
  :alt: MprisControl (playing)

Paused:

.. image:: http://img843.imageshack.us/img843/1633/mpriscontrolpaused.png
  :alt: MprisControl (paused)


Disclaimer
==========

As I couldn't find any real documentation for writing gnome-shell extensions, I based my code on better or worse snippets and tutorials found on internet. Some of the sources are mentioned below:

* `Musings of an OS plumber <http://blog.fpmurphy.com/tag/gnome-shell>`_
* `gnome-shell-extensions <http://git.gnome.org/browse/gnome-shell-extensions/>`_
* `Gnome-shell-extension-Mediasplayers <https://github.com/Caccc/Gnome-shell-extension-Mediasplayers>`_


Instalation
===========
  
The MprisControl@zdyb.tk directory should be copied to /usr/share/gnome-shell/extensions or ~/.local/share/gnome-shell/extensions/::

  # cp MprisControl\@zdyb.tk /usr/share/gnome-shell/extensions
  
or::

  $ cp MprisControl\@zdyb.tk ~/.local/share/gnome-shell/extensions/


If you're using other media player and you know it is MPRIS compliant, you can add
it's name to SUPPORTED_PLAYERS in MprisControl\@zdyb.tk/extension.js file::

  const SUPPORTED_PLAYERS = ["your_player_here", "rhythmbox", "banshee"];


License
=======

Copyright 2011 Aleksander Zdyb

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program.  If not, see http://www.gnu.org/licenses/.