/* Pure calculation engine shared by browser, review, inquiry and Node regression tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./catalog.json'));
  else root.DroneModel = factory(root.DroneCatalog);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (catalog) {
  'use strict';
  const keys = Object.keys(catalog.groups);
  const defaults = Object.fromEntries(keys.map(key => [key, catalog.groups[key].options[0].id]));
  defaults.radio = 'include'; defaults.charger = 'include';
  const money = cents => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD'}).format(cents/100);
  const limits = {reserve:[5,50],hoverWatts:[.1,5000],thrustGrams:[.1,10000],peakAmps:[.01,500],batteryC:[.1,300],extraGrams:[0,2000]};
  function calculate(input = {}, readings = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid configuration.');
    if (!readings || typeof readings !== 'object' || Array.isArray(readings)) throw new Error('Invalid measurements.');
    const values = {}, selected = {}, errors = [], measurements = {};
    for (const key of keys) {
      const id = input[key] === undefined ? defaults[key] : input[key];
      const option = catalog.groups[key].options.find(item => item.id === id);
      if (!option) throw new Error('Unknown '+catalog.groups[key].label+' option.');
      values[key] = id; selected[key] = option;
    }
    for (const [key,[min,max]] of Object.entries(limits)) {
      const raw = readings[key] ?? (key === 'reserve' ? 20 : key === 'extraGrams' ? 0 : '');
      if (raw === '') {measurements[key] = null; continue;}
      const number = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
      if (!Number.isFinite(number) || number < min || number > max) {
        errors.push(`${key}: enter a number from ${min} to ${max}.`); measurements[key] = null;
      } else measurements[key] = number;
    }
    if (measurements.reserve === null) errors.push('Enter a battery reserve from 5 to 50%.');
    if (measurements.extraGrams === null) errors.push('Enter additional payload mass, or 0.');
    const lines = [...keys.map(key => ({...selected[key],category:catalog.groups[key].label})),...catalog.fixed];
    const extra = measurements.extraGrams ?? 0;
    if (extra) lines.push({id:'extra',label:'Additional customer payload (price not included)',grams:extra,cents:0});
    const massGrams = lines.reduce((sum,line)=>sum + (line.offboard ? 0 : line.grams),0);
    const partsCents = lines.reduce((sum,line)=>sum + line.cents,0);
    const marginCents = Math.round(partsCents * 30 / 100);
    const totalCents = partsCents + marginCents;
    const battery = selected.battery;
    // LiPo nominal 3.7 V/cell; mAh / 1000 converts to Ah. Never round intermediate results.
    const nominalVolts = battery.cells * 3.7;
    const energyWh = nominalVolts * battery.mah / 1000;
    const usableWh = measurements.reserve === null ? null : energyWh * (1 - measurements.reserve/100);
    if (!selected.propulsion.cells.includes(battery.cells)) errors.push('Motor-set voltage does not match the battery. Match the motor set and battery cell count.');
    if (!selected.electronics.cells.includes(battery.cells)) errors.push('Controller / ESC voltage does not support this battery. Select the 2S–3S controller.');
    if (selected.props.diameter !== selected.propulsion.diameter) errors.push('Propeller diameter does not match the motor-set concept. Match the 2-inch or 3-inch options.');
    if (!selected.frame.diameters.includes(selected.props.diameter)) errors.push('Propellers exceed this frame concept’s diameter envelope. Choose carbon or custom for 3-inch props.');
    const payloadGrams = selected.sensors.grams + selected.ai.grams + extra;
    if (payloadGrams > selected.frame.payloadLimit) errors.push(`Payload ${payloadGrams} g exceeds this frame concept’s ${selected.frame.payloadLimit} g planning envelope. Select a larger/custom concept or reduce payload.`);
    if (selected.receiver.id === 'custom_rx' && selected.radio.id === 'include') errors.push('The included ELRS transmitter requires the ELRS receiver. Choose ELRS or use your own reviewed radio.');
    const measuredThrust = measurements.thrustGrams;
    const thrustRatio = measuredThrust === null ? null : measuredThrust * 4 / massGrams;
    if (thrustRatio !== null && thrustRatio <= 1) errors.push('Entered maximum thrust is not greater than aircraft weight. This configuration cannot sustain controlled hover under those inputs.');
    const maxBatteryAmps = measurements.batteryC === null ? null : battery.mah/1000 * measurements.batteryC;
    if (maxBatteryAmps !== null && measurements.peakAmps !== null && measurements.peakAmps > maxBatteryAmps) errors.push('Entered total peak current exceeds the battery’s nominal continuous-current rating.');
    const hoverMinutes = measurements.hoverWatts !== null && usableWh !== null ? usableWh / measurements.hoverWatts * 60 : null;
    const warnings = ['All component masses, prices and frame envelopes are planning allowances; exact parts and physical fit require review.', 'No measured noise reduction, autonomous flight or weather rating is established.'];
    if (!measurements.hoverWatts) warnings.push('Hover time needs measured total aircraft hover power for this exact configuration.');
    if (thrustRatio === null) warnings.push('Maximum thrust and lift margin are unknown until tested motor/prop/battery data is entered.');
    else if (thrustRatio < 2 && thrustRatio > 1) warnings.push('Entered thrust-to-weight ratio is below the 2:1 planning target; engineering review is required.');
    if (maxBatteryAmps === null || measurements.peakAmps === null) warnings.push('Battery current capability is not checked: enter continuous C rating and measured total peak current.');
    if (selected.ai.id !== 'none') warnings.push('Compute integration, software and any recurring connectivity fees need a separate quote.');
    if (selected.sensors.id === 'fpv_cam') warnings.push('FPV camera/video-link allowance does not include goggles or a display; these need a separate quote.');
    if (selected.radio.id === 'own') warnings.push('Your own transmitter must match the selected receiver.');
    if (selected.charger.id === 'own') warnings.push('Your own charger must support this LiPo cell count and balance connector.');
    const ready = errors.length === 0;
    return {revision:catalog.revision,values,measurements,lines,massGrams,payloadGrams,partsCents,marginCents,totalCents,nominalVolts,energyWh,usableWh,hoverMinutes,thrustRatio,maxBatteryAmps,errors,warnings,ready};
  }
  function brief(result, notes = '') {
    const cleanNotes = typeof notes === 'string' ? notes.slice(0,4000) : '';
    return ['SILENTFORGE / CUSTOM BUILD REQUEST — CATALOG V'+catalog.revision,
      result.ready ? 'Status: ready for engineering inquiry; not approved for flight.' : 'Status: configuration conflicts — revise before build request.',
      '',...result.lines.map(line=>`${line.category || line.label}: ${line.label} | ${line.offboard?'off aircraft':line.grams+' g'} | ${money(line.cents)}`),
      '',`Aircraft mass allowance: ${result.massGrams} g`, `Parts allowance: ${money(result.partsCents)}`,
      `Planning margin (30% of parts): ${money(result.marginCents)}`, `Planning total: ${money(result.totalCents)} USD`,
      `Battery nominal energy: ${result.energyWh.toFixed(3)} Wh (${result.nominalVolts.toFixed(1)} V × ${catalog.groups.battery.options.find(o=>o.id===result.values.battery).mah} mAh / 1000)`,
      `Reserve: ${result.measurements.reserve ?? 'missing'}% | Usable energy: ${result.usableWh?.toFixed(3) ?? 'unknown'} Wh`,
      `User-entered whole-aircraft hover power: ${result.measurements.hoverWatts ?? 'not supplied'} W`,
      `Energy-based hover estimate: ${result.ready && result.hoverMinutes !== null ? result.hoverMinutes.toFixed(1)+' min' : 'unavailable'}`,
      `User-entered maximum thrust per motor: ${result.measurements.thrustGrams ?? 'not supplied'} g-force`,
      `Thrust-to-weight: ${result.thrustRatio?.toFixed(2) ?? 'unknown'} : 1`,
      `User-entered battery continuous rating: ${result.measurements.batteryC ?? 'not supplied'} C | Nominal current limit: ${result.maxBatteryAmps?.toFixed(2) ?? 'unknown'} A`,
      `User-entered total peak current: ${result.measurements.peakAmps ?? 'not supplied'} A`,
      '',...result.errors.map(e=>'CONFLICT: '+e),...result.warnings.map(w=>'REVIEW: '+w),
      '', 'Excluded: engineering/assembly labor, software, recurring services, shipping, taxes and any separately quoted items. Customer-supplied payload cost is excluded. Not a quotation or order. Performance inputs are customer supplied and unverified. No payment is collected.',
      '', 'Build notes: '+(cleanNotes || 'None')].join('\n');
  }
  return {catalog,keys,defaults,limits,money,calculate,brief};
});
