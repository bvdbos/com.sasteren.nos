'use strict';

const request = require('request-promise');
const cheerio = require('cheerio');
const Homey = require('homey');

const BROADCAST_TITLES = [
	'NOS Journaal', 'Nieuws in 60 seconden', 'Nieuwsuur', 'NOS Jeugdjournaal',
	'NOS Sportjournaal', 'NOS Studio Voetbal', 'NOS Studio Sport Eredivisie'
];

class NOS extends Homey.App {

	async onInit() {
		this.log(`${this.manifest.id} is running...`);

		this.programMap = {};

		for (let name of BROADCAST_TITLES) {
			this.programMap[name] = {
				token: new Homey.FlowToken(name, { type: 'string', title: name }),
			};
			this.programMap[name].token.register()
				.catch(err => this.error(`failed to register token ${name}`, err));
		}

		await this.updateBroadcasts();

		// Update broadcast urls every 30 minutes
		setInterval(() => {
			this.updateBroadcasts();
		}, 30 * 60 * 1000);
	}

	updateBroadcasts() {
		this.log('updateBroadcasts()');
		return request.get('https://nos.nl/uitzendingen/')
			.then(res => {
				const $ = cheerio.load(res);

				$('.broadcast-link').each((i, data) => {

					// Parse url, name and date from HTML
					const name = $(data.children[0].children[1]).text();
					const date = new Date(($(data.children[0].children[2]).attr('datetime').split('+')[0]) + 'Z');
					const videoId = data.attribs.href.split('/')[2].split('-')[0];
					const videoDate = `${date.getFullYear()}/${("0" + (date.getMonth() + 1)).slice(-2)}/${("0" + date.getDate()).slice(-2)}`;
					const url = `download.omroep.nl/nos/content/mp4/web02/${videoDate}/${videoId}/mp4_web02_backup.mp4`;
console.log(url);
					// If newer broadcast available, add it
					if (typeof this.programMap[name].date === 'undefined' || this.programMap[name].date < date) {
						this.programMap[name].url = url;
						this.programMap[name].name = name;
						this.programMap[name].date = date;
						this.programMap[name].token.setValue(url);
					}
				});

				return true;
			})
			.catch(err => {
				this.error('failed to update broadcasts', err);
			});
	}
}

module.exports = NOS;