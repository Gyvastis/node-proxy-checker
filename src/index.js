const axios = require('axios').default;
const fs = require('fs');
const UserAgent = require('user-agents');
const Promise = require('bluebird');
axios.Promise = Promise;

const readFile = Promise.promisify(fs.readFile);

const agents = {
  http: require('http-proxy-agent'),
  https: require('https-proxy-agent'),
  socks4: require('socks-proxy-agent'),
  socks5: require('socks-proxy-agent'),
};
const agent = (protocol, proxy) => new agents[protocol](proxy);
const outputFile = './output/output.json';
const concurrency = 30;
const timeout = 8000;

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// const ipCheckUrl = 'http://checkip.dyndns.com/';
// const ipCheckUrl = 'https://ipinfo.io/ip';
const getCurrentIp = () => axios.get('https://ifconfig.co/ip', {
  responseType: 'text',
  headers: {
    'User-Agent': (new UserAgent()).toString(),
  },
}).then(response => response.data.trim())

const checkProxy = (ip, port, protocol) => {
  const proxyProtocol = !protocol || protocol === 'https' ? 'http' : protocol;
  const proxy = `${proxyProtocol}://${ip}:${port}`;

  if(!ip || !port || !proxyProtocol) return new Promise((resolve, reject) => reject({
    name: 'MissingMandatory',
    message: 'IP, PORT or PROTOCOL missing.'
  }));

  console.log(`Checking '${protocol}' ${proxy}...`);
  const startedAt = new Date().getTime();

  return axios.get('https://ifconfig.co/json', {
    httpsAgent: agent(!protocol ? 'http' : protocol, proxy),
    maxRedirects: 0,
    responseType: 'json',
    timeout,
    headers: {
      'User-Agent': (new UserAgent()).toString(),
    },
  })
  .then(response => response.data)
  .then(json => {
    if(!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(json.ip)) {
        throw Error('Response has been modified by proxy.');
    }
    return { 
      realIp: json.ip,
      countryCode: json.country_iso,
    };
  })
  .then(json => ({
    ip,
    port,
    protocol,
    responseTime: new Date().getTime() - startedAt,
    ...json,
  }));
};

const writeOutputAppend = (dataItem) => {
  try {
    fs.appendFileSync(outputFile, `${JSON.stringify(dataItem)},\n`);
  } catch (err) {
    console.error(err);
  }
}

(async () => {
  const myIp = await getCurrentIp();
  console.log(`Current IP: ${myIp}`);

  // let proxies = await readFile('./src/proxies.json', 'utf8').then(JSON.parse)
  let proxies = await fetch('https://raw.githubusercontent.com/HandyProxy/node-proxy-scraper/master/output/output.merged.json').then(res => res.json());
  proxies = shuffle(proxies)
  // .slice(1,10)

  const startedAt = new Date().getTime();
  let processed = 0;
  fs.writeFileSync(outputFile, "[\n")

  Promise.map(proxies, proxy => {
    return checkProxy(proxy.ip, proxy.port, proxy.protocol)
      .then(data => ({
        ...proxy,
        ...data,
        hidesIp: data.realIp !== myIp,
      }))
      .then(data => {
        console.log(`${++processed}/${proxies.length} ${JSON.stringify(data)}`)
        return data;
      })
      .then(writeOutputAppend)
      .catch(err => {
        console.log(`${++processed}/${proxies.length} ${err.name}: ${proxy.protocol}://${proxy.ip}:${proxy.port}. ${err.message}`);
      });
  }, { concurrency })
  .then(() => readFile(outputFile, 'utf8').then(json => {
    fs.writeFileSync(outputFile, json.replace(/[^}]+$/g, '')+"\n]")
  }))
  .then(() => console.log(new Date().getTime() - startedAt));
})();
