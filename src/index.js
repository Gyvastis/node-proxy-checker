const fetch = require('node-fetch');
const fs = require('fs');
const Promise = require('bluebird');
fetch.Promise = Promise;

const readFile = Promise.promisify(fs.readFile);

const agents = {
  http: require('http-proxy-agent'),
  https: require('https-proxy-agent'),
  socks4: require('socks-proxy-agent'),
  socks5: require('socks-proxy-agent'),
};
const agent = (protocol, proxy) => new agents[protocol](proxy);
const outputFile = './output/output.json';
const concurrency = 9;
const timeout = 8000;

const ipCheckUrl = 'http://checkip.dyndns.com/';
// const ipCheckUrl = 'https://ipinfo.io/ip';

const getCurrentIp = () => fetch(ipCheckUrl)
  .then(response => response.text())
  .then(response => response.trim())
  .then(response => response.match(/Current IP Address: (.+)<\/body>/)[1].trim());

const checkProxy = (ip, port, protocol) => {
  const proxy = `${protocol}://${ip}:${port}`;

  if(!ip || !port || !protocol) return new Promise((resolve, reject) => reject({
    name: 'MissingMandatory',
    message: 'IP, PORT or PROTOCOL missing.'
  }));

  console.log(`Checking ${proxy}...`);
  const startedAt = new Date().getTime();

  return fetch(ipCheckUrl, {
    agent: agent(protocol, proxy),
    timeout,
  })
  .then(response => {
    if (response.ok) {
        return response;
    } else {
        throw Error(response.statusText);
    }
  })
  .then(response => response.text())
  .then(response => response.trim())
  .then(response => response.match(/Current IP Address: (.+)<\/body>/)[1].trim())
  .then(realIp => {
    if(!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(realIp)) {
        throw Error('Response has been modified by proxy. ' + realIp);
    }

    return realIp;
  })
  .then(realIp => ({
    ip,
    port,
    protocol,
    realIp,
    responseTime: new Date().getTime() - startedAt,
  }));
};

const writeOutputAppend = (dataItem) => {
  try {
    fs.appendFileSync(outputFile, `${JSON.stringify(dataItem)},\n`);
  } catch (err) {
    // An error occurred
    console.error(err);
  }
}

(async () => {
  const myIp = await getCurrentIp();
  console.log(`Current IP: ${myIp}`);

  const proxies = await readFile('./src/proxies.json', 'utf8')
    .then(JSON.parse)
    // .then(data => data.slice(1,10))

  const startedAt = new Date().getTime();
  let processed = 0;
  fs.writeFileSync(outputFile, "[\n")

  Promise.map(proxies, proxy => {
    return checkProxy(proxy.ip, proxy.port, proxy.protocol)
      .then(data => ({
        ...data,
        ...proxy,
        hidesIp: data.realIp !== myIp,
      }))
      // .then(data => getIpCountry(ip, port, protocol).then(countryCode => ({
      //   ...data,
      //   country_code: countryCode,
      // })))
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
