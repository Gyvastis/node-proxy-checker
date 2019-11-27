const fetch = require('node-fetch');
const AbortController = require('abort-controller');
const Promise = require('bluebird');
fetch.Promise = Promise;
const agents = {
  http: require('http-proxy-agent'),
  https: require('https-proxy-agent'),
  socks4: require('socks-proxy-agent'),
  socks5: require('socks-proxy-agent'),
};
const proxies = [
  {"ip":"52.157.177.98","port":"80","protocol":"http","realIp":"52.157.177.98","responseTime":178,"hidesIp":true},
  {"ip":"47.52.32.109","port":"80","protocol":"http","realIp":"213.127.47.88","responseTime":935,"hidesIp":false},
  {"ip":"36.25.243.51","port":"80","protocol":"http","realIp":"36.25.243.51","responseTime":715,"hidesIp":true},
  {"ip":"23.101.2.247","port":"81","protocol":"http","realIp":"23.101.2.247","responseTime":733,"hidesIp":true},
  {"ip":"219.232.48.222","port":"8080","protocol":"http","realIp":"118.144.139.220","responseTime":685,"hidesIp":true},
  {"ip":"212.47.234.231","port":"80","protocol":"http","realIp":"213.127.47.88","responseTime":4309,"hidesIp":false},
  {"ip":"183.146.213.198","port":"80","protocol":"http","realIp":"183.146.213.157","responseTime":720,"hidesIp":true},
  {"ip":"182.19.41.145","port":"80","protocol":"http","realIp":"182.19.41.145","responseTime":3205,"hidesIp":true},
  {"ip":"13.56.38.158","port":"80","protocol":"http","realIp":"13.56.38.158","responseTime":487,"hidesIp":true},
  // {"ip":"103.60.172.67","port":"80","protocol":"http","realIp":"{\n  \"origin\": \"158.69.138.27, 103.60.172.67, 158.69.138.27\"\n}","responseTime":607,"hidesIp":true}
  {"ip":"103.52.188.144","port":"80","protocol":"http","realIp":"103.52.188.144","responseTime":596,"hidesIp":true},
  // {"ip":"103.239.254.210","port":"80","protocol":"http","realIp":"{\n  \"origin\": \"78.37.18.28, 103.239.254.210, 78.37.18.28\"\n}","responseTime":500,"hidesIp":true}
  {"ip":"101.4.136.34","port":"81","protocol":"http","realIp":"101.4.136.34","responseTime":1340,"hidesIp":true},
].map(proxy => `${proxy.ip},${proxy.port},${proxy.protocol}`);
const concurrentChecks = 10;
const requestTimeout = 5000;

// const proxyTimeout = 5000;
// const ipCheckUrl = 'http://checkip.dyndns.com/';
const ipCheckUrl = 'https://ipinfo.io/ip';
const countryCheckUrl = 'https://api.myip.com/';

const getIpCountry = (ip, port, protocol) => fetch(countryCheckUrl, {
    agent: new agents[protocol](`${protocol}://${ip}:${port}`),
    redirect: 'follow',
    follow: 1,
    timeout: requestTimeout,
})
  .then(response => response.text())
  .then(response => response.trim())
  .then(data => JSON.parse(data))
  .then(({ cc }) => cc)

const getCurrentIp = () => fetch(ipCheckUrl)
  .then(response => response.text())
  .then(response => response.trim())
  // .then(response => response.match(/Current IP Address: (.+)<\/body>/)[1]);

const checkProxy = (ip, port, protocol) => {
  const Agent = agents[protocol];
  const proxy = `${protocol}://${ip}:${port}`;
  const startedAt = new Date().getTime();

  const controller = new AbortController();
  const timeout = setTimeout(() => { controller.abort(); }, requestTimeout);

  // console.log(proxy)

  return fetch(ipCheckUrl, {
    agent: new Agent(proxy),
    signal: controller.signal,
    redirect: 'follow',
    follow: 1,
    timeout: requestTimeout,
  })
  .then(function checkStatus(response) {
      if (response.ok) {
          return response;
      } else {
          throw Error(res.statusText);
      }
  })
  .then(response => response.text())
  .then(response => response.trim())
  // .then(response => response.match(/Current IP Address: (.+)<\/body>/)[1])
  .then(realIp => ({
    ip,
    port,
    protocol,
    realIp,
    responseTime: new Date().getTime() - startedAt,
  }))
  .finally(() => {
    clearTimeout(timeout);
  });
};

(async () => {
  console.log('Current IP: ');
  const myIp = await getCurrentIp();
  console.log(myIp);

  Promise.map(proxies, proxyData => {
    const [ ip, port, protocol ] = proxyData.split(',');

    return checkProxy(ip, port, protocol)
      .then(data => ({
        ...data,
        hidesIp: data.realIp !== myIp,
      }))
      // .then(data => getIpCountry(ip, port, protocol).then(countryCode => ({
      //   ...data,
      //   country_code: countryCode,
      // })))
      .then(data => {
        console.log(JSON.stringify(data))
      })
      .catch(err => {
        console.log(`${err.name}: ${protocol}://${ip}:${port}. ${err.message}`);
      });
  }, { concurrency: concurrentChecks });
})();
