export const PROJECTILE_STYLES = Object.freeze({
  sprout: Object.freeze({ shape:'leaf', trail:'short', mark:'leaf' }),
  dew: Object.freeze({ shape:'droplet', trail:'ripple', mark:'ripple' }),
  puff: Object.freeze({ shape:'spore', trail:'soft', mark:'burst' }),
  thorn: Object.freeze({ shape:'dart', trail:'straight', mark:'cross' }),
  gust: Object.freeze({ shape:'wind', trail:'curl', mark:'gust' }),
  ember: Object.freeze({ shape:'flame', trail:'ember', mark:'flame' }),
  briar: Object.freeze({ shape:'seed', trail:'roots', mark:'roots' })
});

export function projectileStyleForTower(type) {
  return PROJECTILE_STYLES[type] || Object.freeze({ shape:'orb', trail:'none', mark:'spark' });
}
