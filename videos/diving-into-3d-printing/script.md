# Diving Into 3D Printing

> Draft script. This hasn't been filmed yet, so sections and wording may still change.

## Introduction / Hook

3D printing is an awesome technology. But before today, I didn't have a printer.

Today I am diving in head first.

We start with a speedrun of printer unboxing.

Integrate the printer into Home Assistant and Spoolman.

A little bit of vibe coding.

And come out the other side with a "homelab 3D printer."

If that sounds cool, stay right there... because this is about to be fun.

## Research

Before we can build an end-to-end printing system, we need a printer.

When looking for a 3D printer there are a few key things I look for.

I am a firm believer in owning my tech. Whatever hardware I buy, I would like to have root access on.

I want a printer that is faster than a bed slinger.

I will never, ever use a "cloud app" for my printer. I am capable of managing my network to allow me remote access while I am away. I don't want my printer phoning out to "the cloud."

I want something that is functional out of the box, but can be upgraded and changed later.

Bamboo Lab is out, because I can't own it.

Voron is out, because I want it to work out of the box.

Ender 3 Pro is out, because I want relative speed.

I came upon the QIDI Q2.

Realistically, it checks most of the boxes very well.

Root access / open source (kinda)
Customizable
Speed
No cloud (kinda)

In the words of Thomas Sanladerer:

PAUSE

Ya, that sounds perfect.

So...
(soft of drawn out "sooooo")

## Assembly

Alright, we just took delivery of the QIDI Q2, let's get it set up.

Setup turned out to be fairly straightforward.

Open the box.

A little bit of manual reading.

Remove some packaging.

Take out a few screws.

Power the printer on.

After that the printer will wake up and get ready for initial config.

Select your language.

The printer will then walk through unboxing it, to make sure you have it all right.

Next it will perform some self tests, in my case all of which passed.

The printer will then home itself, and begin the initial bed leveling.

And finally the printer will perform input shaping. This is probably the most stressful part. I know what it's doing, it just doesn't seem healthy to be making all these noises, but don't worry, it will be fine.

## First Print

And now we have a 3D printer, which means of course the first thing we print needs to be a 3D Benchy.

The printer comes with 20 grams of PLA included. I got a little bit confused about loading the filament correctly but eventually got it.

I waited an astounding 20 minutes, and this came out. Ya, if one is really, really picky there might be a few things to critique, but it's an impressive 20-minute Benchy.

Granted we are using manufacturer G-code so it's fairly tuned, but still, "I'M IMPRESSED."

## Qidi Box Setup

Well, now that we know the printer works, let's get the box set up.

The "QIDI Box" doubles as a filament switcher and dryer.

Again, setup is easy and consists of:

Sorta skimming the manual,

Unpackaging the components,

Building the box standoff ring,

Adding the desiccant into the box to keep filament dry,

Adding the standoff spacer to the printer.

The box can then be set directly on top of the printer.

The single spool holder needs to be removed and the filament feeder can be added in its place.

One PTFE tube is connected to each port on the box and they all run back to the filament feeder box.

A single PTFE tube runs into the printer then.

To organize the tubes, the printer comes with little clips which are very nice.

Finally, connect the wires and turn it on.

The screen will recognize the box and you can load filament.

Official QIDI filament comes with NFC tags in the spools that the system will pick up and know what filament is on.

Other filament needs to be set manually.

This is annoying, but I have a solution.

Before we solve that though, we need to get the printer connected to the Wi-Fi.

## Air Gapped Config

This printer is "LAN first," but I don't like it.

Before connecting to my Wi-Fi, I enable "LAN Only Mode."

I connected it to my primary network (with internet access), and guess what:

It was still connecting out to the cloud.

That is not acceptable.

That switch probably either does nothing, or maybe it disables app connectivity, but the printer is still reaching out.

My solution is to put this on my `Internal_IoT` network, where there is no internet access.

You say, if there's no internet, why bother connecting it.

All the services that are integrating to the printer are hosted on my network as well. So I can allow communication to my services without allowing the broad internet. I host my own VPN solution and can get access to the printer "via the internet," but the printer cannot talk out to the internet.

Since the printer does not have access to the internet, we will need to change a few things on the printer.

## Accessing the Printer

When I go to the Fluidd web UI, I don't want to go to an insecure IP address. Rather, I want a fully qualified domain name with SSL.

To do that I need a DNS record and a trusted self-signed cert.

## DNS Record

Currently I manage my DNS records via OpenTofu, living in GitLab.

Here is the commit that adds the record.

Can't go super deep here, but if you want to see the DNS setup, comment below.

To test the DNS record, let's make sure we can look up the DNS name and get the IP address.

## Trusted Self Signed Cert

I have a lab-wide self-signed certificate authority that I've trusted on all my devices.

With that authority I created a certificate for the printer.

Your operating system or browser needs to be configured to trust the CA.

We can see that my browser is configured to trust `internal-ca`.

With my trusted CA authority I created a server certificate for the printer.

You can see the `.crt` and `.key` file in this directory.

Let's go load up the site in the browser and confirm that we have an SSL cert.

## Moonraker Authentication

Right now anyone with access to my network can log into the printer.

Let's secure access to it.

## Integration

Let's integrate the printer into my smart services.

The first of which is Home Assistant.

The goal is to be able to build automations between my home and printer.

I use a local voice pipeline in Home Assistant and want to interact with my printer through it.

## Smart Plug

One slight annoyance with the QIDI is that if it is powered on, it will always have a fan running. To remedy this, I am using a Zigbee smart plug for full printer power down when not in use. Link below. 👇

Everything is connected to a UPS for power redundancy.

Since the printer and box both have separate power supplies, I am using a power strip to split the power for both.

Since the UPS already has surge protection, it's not recommended that the power strip has surge protection too. This one doesn't, link below. 👇

## Trust Certificate

There is a Moonraker Home Assistant integration, but before we can integrate it, we need to tell Home Assistant to trust the certificate authority.

If you are not verifying SSL, you can skip this step.

I am currently running Home Assistant OS, so this is how to trust a CA with that. If you are running it as a container it will be different.

You will need to have HACS installed, so if you don't have it installed yet, there's a link in the video description. 👇

Log in to your Home Assistant.

Navigate to HACS.

Search for `hass-additional-ca`.

Click the download button.

After that you will come into the file editor and create a folder called `additional_ca`.

You can then place your certificate authority file inside the folder.

We then need to make a change to `configuration.yaml` and reference our CA to trust.

We are then going to check our config and restart Home Assistant.

## Setup Integration

Now we are ready to set up the Moonraker custom integration.

Again, head to HACS and install the Moonraker plugin.

## Voice Pipeline

I think it would be pretty cool to have some of these entities available in my voice pipeline. Home Assistant does not expose everything, due to limited context for small models.

## Spoolman

When I start a print, I don't want to have to select what filament I am using in Spoolman and on the printer.

My solution to this is a somewhat involved sync tool and some macros.

Spoolman holds the filament spool's location and knows what slot it is in on the printer.

The sync tool will take those filaments, "Black PETG" or "Grey PLA," and map them to the filament that the printer knows is installed.

When I change the filament in the printer, all I need to do is update its location in Spoolman.

The sync tool will then sync that filament color and name onto the printer.

I then have a custom macro to change the active Spoolman filament, which runs on a tool change or at the beginning of a print.

## Vibe Coding

We live in a wild time where previously this would have taken many hours to learn a language and implement it tediously. Today one can explain to an agent what he wants and watch a working piece of software pop out. If you're not a fan of vibe coding, I don't entirely disagree... but this tool took 15 minutes to build and seems to work well.

## Deployment with Docker

I deployed the sync tool beside my Spoolman instance, on my production Docker server.

## Orca Slicer Setup

That's great, the datacenter is working, but this is a printer.

Let's slice and print something of our own.

We need a slicer.

QIDI recommends QIDI Slicer, but I am not really a fan of forks that add bloat and remove features.

I am gonna try OrcaSlicer. I know Orca has its quirks, but as a beginner I don't want to hand-tune profiles for PrusaSlicer.

## PLA

Let's print some PLA. I used pretty much the basic Orca profile and printed a Benchy using QIDI PLA and got decent results. Time was in the range of 40 minutes, and one can probably point out a few flaws, but that's good for me.

## Slicer Customization

To make the printer auto-pick filament in Spoolman, you'll need to make two changes to your slicer's printer profile.

All the commands can be found in the write-up, link below.

## Poop Chute

I took a look out there, and it looks like this is a community-solved problem.

Let's slice and print.

## Wrap and Call to Action

Wow, this got a little longer than I was expecting, but if you're still here, thank you so much for watching to the end.

I have so many ideas going forward in the space of homelab, AI, smart home, 3D printing, and integration.

I am learning that content creation takes significant time and energy to produce, but I thoroughly enjoy it.

If you want to support the channel, feel free to poke at the links in the video description. They are all Amazon affiliate links. If you click them and purchase something within a 24-hour window, I will receive a small kickback, with zero additional cost to you.

Thanks again, bye, and now go build something.
