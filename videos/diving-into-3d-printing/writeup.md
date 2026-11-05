3D printing is awesome technology, and until now I didn't have a printer. This writeup covers unboxing, integrating the printer into Home Assistant and Spoolman, some vibe-coded tooling, and the end result: a proper "homelab 3D printer."

## Picking a Printer

What I look for in a printer:
- Root access
- Faster than a bed slinger
- No required cloud connectivity
- Functional out of the box, but upgradable later
- More bed space than an Ender 3 Pro
- Decent support for advanced filaments

That ruled a few things out:
- **Bambu Lab** — closed ecosystem, no real ownership of the hardware
- **Voron** — great, but not "works out of the box"
- **Ender 3 Pro** — too slow

I landed on the [**QIDI Q2**](https://link.amazon/B0acyPa8L): root access, mostly open source, customizable, fast, cloud-optional.

> "It's sort of the Linux of 3D printers."
> — [Thomas Sanladerer](https://www.youtube.com/watch?v=30gz9rgw94w)

## Assembly

Setup was straightforward:
- Unbox, remove packaging and protective screws
- Power on, pick a language
- Guided walkthrough confirms nothing's missing
- Self tests, homing, bed leveling
- Input shaping (noisy, but normal)

## First Print

![First benchy print](/videos/diving-into-3d-printing/assets/first-benchy-print.jpg)

First print had to be the classic 3D Benchy. Loading filament took a minute to figure out, but ~20 minutes later — on QIDI's included PLA and their tuned manufacturer G-code — I had a genuinely impressive Benchy.

## QIDI Box Setup

The QIDI Box is a filament switcher/dryer that sits on top of the printer.

Setup:
- Build the standoff ring, load the desiccant
- Attach the standoff spacer to the printer, set the box on top
- Remove the single spool holder, install the filament feeder in its place
- Route a PTFE tube from each box port back to the feeder, and one tube into the printer (the included clips keep this tidy)
- Connect the wiring, power on

Once the printer recognizes the box, it can load filament directly from it. Official QIDI filament carries an NFC tag that self-identifies — anything else has to be set manually, which gets old fast (fixed later with Spoolman).

Before that, the printer needs to be on the network.

## Networking

### LAN-Only, Air-Gapped

The QIDI Q2 is "LAN first" but not LAN-only by default. Enabling LAN Only Mode and connecting it to my main network, it still phoned out to the cloud — the switch either does nothing or only blocks the companion app, not the printer itself.

Fix: an isolated `Internal_IoT` VLAN with no internet route. Every service the printer talks to is hosted on my own network, so I can allow that traffic specifically without giving the printer a path out. Remote access goes through my own VPN.

With no internet access, a couple of the printer's defaults need to point at local infrastructure instead.

### DNS Server

The printer defaults to public resolvers it can't reach from the air-gapped VLAN. Point it at a local one:

```
nano /etc/resolv.conf
```

```
nameserver 10.81.30.1
options edns0 trust-ad
search lan
```

### NTP Server

Same problem with time — no internet, no public NTP:

```
sudo nano /etc/systemd/timesyncd.conf
```

```
[Time]
NTP=ntp.bird.groffhome.com
#FallbackNTP=0.debian.pool.ntp.org 1.debian.pool.ntp.org 2.debian.pool.ntp.org 3.debian.pool.ntp.org
#RootDistanceMaxSec=5
#PollIntervalMinSec=32
#PollIntervalMaxSec=2048
```

### DNS Record

My DNS is managed via OpenTofu, in GitLab — drop a comment if you want the commit that adds the record. Once it's applied, confirm it resolves with `dig` or `nslookup` before moving on.

### SSL Certificate

I have a lab-wide self-signed CA, trusted on every device, and issued a server certificate for the printer from it.

1. Copy the cert to the printer:
   ```
   scp ./qidi.* mks@qidi.bird.groffhome.com:/
   ```
2. SSH in and move the files into place:
   ```
   /etc/nginx/ssl/
   ```
3. Lock down permissions:
   ```
   sudo chown root:root /etc/nginx/ssl/qidi.*
   sudo chmod 644 /etc/nginx/ssl/qidi.crt
   sudo chmod 600 /etc/nginx/ssl/qidi.key
   ```
4. Point nginx at it, in `/etc/nginx/sites-enabled`:
   ```
   listen 443 ssl;
   ssl_certificate     /etc/nginx/ssl/qidi.crt;
   ssl_certificate_key /etc/nginx/ssl/qidi.key;
   ```
5. Test and reload:
   ```
   sudo nginx -t && sudo systemctl reload nginx
   ```

Load the webui and confirm the cert comes back clean.

### Moonraker Authentication

By default anyone on the network can hit the printer's webui unauthenticated. Add a user in the webui, then require logins in `~/printer_data/config/moonraker.conf`:

```
[authorization]
force_logins: True
trusted_clients:
    127.0.0.1
cors_domains:
    https://qidi.bird.groffhome.com
    http://qidi.bird.groffhome.com
```

## Home Assistant Integration

Goal: automations between the printer and the rest of the home, plus printer status surfaced in a local voice pipeline. All of this runs on [Home Assistant](https://www.home-assistant.io/).

### Smart Plug

The QIDI always runs a fan when powered on, even idle. A [Zigbee smart plug](https://link.amazon/B03ugj9kz) handles full power-down when it's not printing. Power setup:
- Printer and Box run on separate PSUs, split off a single [power strip](https://link.amazon/B0a3845a6)
- Everything sits behind an [APC UPS](https://link.amazon/B02ITkU84) — since the UPS already has surge protection, the power strip deliberately doesn't

### Trusting the Certificate Authority

Before the Moonraker integration can talk to the printer over HTTPS, Home Assistant needs to trust the internal CA (skip this if you're not verifying SSL). Steps below are for Home Assistant OS — a container install differs.

1. Install [HACS](https://www.hacs.xyz/docs/use/download/download/) if it isn't already
2. In HACS, install [hass-additional-ca](https://github.com/Athozs/hass-additional-ca)
3. In the file editor, create an `additional_ca` folder and drop the CA cert in it
4. Reference it in `configuration.yaml`, check the config, restart Home Assistant

### Moonraker Integration

Install [moonraker-home-assistant](https://github.com/marcolivierarsenault/moonraker-home-assistant) via HACS, add the integration, point it at the printer.

### Voice Pipeline

Home Assistant doesn't expose every entity to the voice pipeline by default — limited context for small models. Entities worth exposing:
- Current print state
- Print duration
- Print ETA
- Print time left
- Progress percentage

## Spoolman Integration

> A full video on setting up Spoolman is in progress. I'll link to the draft here once
> it's up, and swap it for the finished video once that's done.

Goal: never manually pick the active filament in both [Spoolman](https://github.com/Donkie/Spoolman) and the printer.

In `~/printer_data/config/moonraker.conf`:
```
[spoolman]
server: https://spoolman.groffhome.com:443
sync_rate: 5
```

Spoolman tracks which box slot each spool is physically loaded into. A sync tool maps Spoolman's filament names ("Black PETG," "Grey PLA") onto whatever the printer reports for that slot — so updating a spool's location in Spoolman is the only manual step. From there the sync tool pushes the filament name/color onto the printer, and a macro swaps the active Spoolman filament on tool change or print start.

### Macros

Back up the existing config first:

```
cd ~/printer_data/config
cp printer.cfg printer.cfg.pre-spoolman
```

Create `spoolman.cfg`:

```
# spoolman.cfg - Spoolman integration for QIDI Q2 + QIDI Box
# Included from printer.cfg; uses the existing [save_variables] there
# Slicer hooks: USE_TOOL T=[initial_tool] (start) and USE_TOOL T=[next_extruder] (change)

[gcode_macro SET_ACTIVE_SPOOL]
gcode:
  {% if params.ID %}
    {action_call_remote_method("spoolman_set_active_spool", spool_id=params.ID|int)}
  {% else %}
    {action_respond_info("Parameter 'ID' is required")}
  {% endif %}

[gcode_macro CLEAR_ACTIVE_SPOOL]
gcode:
  {action_call_remote_method("spoolman_set_active_spool", spool_id=None)}

# Usage: SET_SLOT_SPOOL SLOT=0 SPOOL=12   (SPOOL=0 clears the slot)
[gcode_macro SET_SLOT_SPOOL]
description: Assign a Spoolman spool ID to a Box slot (0-15)
gcode:
  {% set slot = params.SLOT|int %}
  {% set spool = params.SPOOL|default(0)|int %}
  SAVE_VARIABLE VARIABLE=spool_slot{slot} VALUE={spool}
  {action_respond_info("Slot %d -> spool %d" % (slot, spool))}

[gcode_macro USE_SLOT]
description: Make the spool in a Box slot the active Spoolman spool
gcode:
  {% set slot = params.SLOT|int %}
  {% set svv = printer.save_variables.variables %}
  {% set spool = svv['spool_slot' ~ slot]|default(0)|int %}
  {% if spool > 0 %}
    SET_ACTIVE_SPOOL ID={spool}
  {% else %}
    CLEAR_ACTIVE_SPOOL
    {action_respond_info("No spool assigned to slot %d" % slot)}
  {% endif %}

# Called from slicer G-code; follows QIDI's tool->slot map (value_tN)
[gcode_macro USE_TOOL]
description: Activate the Spoolman spool for a tool, via QIDI's tool->slot map
gcode:
  {% set tool = params.T|int %}
  {% set svv = printer.save_variables.variables %}
  {% set slot = svv['value_t' ~ tool]|default('slot' ~ tool)|replace('slot','')|int %}
  USE_SLOT SLOT={slot}

[gcode_macro SHOW_SLOTS]
description: Show tool -> Box slot -> Spoolman spool mapping
gcode:
  {% set svv = printer.save_variables.variables %}
  {% set lines = [] %}
  {% for t in range(16) %}
    {% if ('value_t' ~ t) in svv %}
      {% set slot = svv['value_t' ~ t]|string|replace('slot','')|int %}
      {% set spool = svv['spool_slot' ~ slot]|default(0)|int %}
      {% set _ = lines.append("T%d -> slot %d -> spool %s" % (t, slot, spool if spool > 0 else "none")) %}
    {% endif %}
  {% endfor %}
  {action_respond_info(lines|join("\n") if lines else "No value_tN entries found")}
```

Include it from `printer.cfg`:
```
[include spoolman.cfg]
```

### Sync Tool

[qidi-spoolman-sync](https://github.com/mikiahgroff/qidi-spoolman-sync) — vibe-coded in about 15 minutes, and it holds up. Deployed via Docker alongside the Spoolman instance on my production server.

## Slicing

### OrcaSlicer

QIDI recommends QIDI Slicer, but I'd rather skip a fork that adds bloat and strips features. Going with OrcaSlicer over PrusaSlicer since there are fewer profiles to hand-tune as a beginner.

### First PLA Print

Stock OrcaSlicer profile, [QIDI PLA](https://link.amazon/B09WFjS0G), another Benchy — about 40 minutes, solid results for an untuned profile.

### Slicer Customization for Spoolman

Two edits to the printer profile's machine G-code make the printer auto-select the right Spoolman filament. In OrcaSlicer: select the printer profile → Printer Settings → **Machine G-code**.

**Start G-code** — below `T[initial_tool]`, add:
```
T[initial_tool]
USE_TOOL T=[initial_tool]
```

**Change filament G-code** — below the `T[next_extruder]` that follows `UNLOAD_T[current_extruder]`, add:
```
UNLOAD_T[current_extruder]
T[next_extruder]
USE_TOOL T=[next_extruder]
```

## Poop Chute

Filament purge during tool changes needs somewhere to go — already a solved problem in the community. Sliced and printed the [community design](https://makerworld.com/en/models/2263688-qidi-q2-poop-chute-for-filament-purge#profileId-2466798) on the Q2 itself.

## Wrap Up

More ideas coming across homelab, AI, smart home, and 3D printing. Thanks for reading — now go build something.

Links are Amazon affiliate links — no extra cost to you, small kickback to me if you buy within 24 hours of clicking.
