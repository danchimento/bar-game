/**
 * Centralized depth registry for all Phaser display objects.
 * Higher values render in front of lower values.
 *
 * Usage: import { DEPTH } from '../constants/depths.js';
 *        sprite.setDepth(DEPTH.GUESTS);
 */
export const DEPTH = {
  // Background
  BACKGROUND:        0,   // Wall, floor fills

  // Bar area
  SERVICE_MAT:       3,   // Drink staging area on floor
  STOOLS:            4,   // Bar stool sprites
  GUESTS:            5,   // Guest sprites (standing + sitting)
  BAR_SURFACE:       6,   // Bar top surface (occludes guest lower torso)
  BAR_ITEMS:         7,   // Dirty seats, cash, under-bar stations (glass rack, dishwasher, trash)
  GUEST_SIP_GLASS:   8,   // Glass during sip animation
  SEAT_DRINKS:       9,   // Drinks sitting at seats on bar
  SEAT_ZONES:       10,   // Interactive seat tap zones
  BARTENDER:        10,   // Bartender sprite (same layer as seat zones)
  BUSY_BAR:         11,   // Action progress bar
  BARTENDER_CARRY:  12,   // Carried item icon above bartender

  // Stations (back counter)
  STATION_SPRITE:   14,   // Station images (on_counter placement)
  STATION_COUNTER:  15,   // Counter tile sprite
  STATION_EMBEDDED: 16,   // Stations embedded in counter (sink)
  STATION_ZONE:     17,   // Station interactive zones (topmost game layer)

  // UI overlays
  HUD:              50,   // HUD elements
  MODAL:            70,   // Modal containers (dim + content)
  MODAL_POUR_STREAM:71,   // DrinkModal pour stream graphics
  MODAL_GLASS:      72,   // DrinkModal glass + overflow graphics
};
