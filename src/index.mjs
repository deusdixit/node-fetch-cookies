import fetch from "node-fetch";
import CookieJar from "./cookie-jar";
import Cookie from "./cookie";
import urlParser from "url";

async function cookieFetch(cookieJars, url, options) {
    let cookies = "";
    const domains =
        urlParser
        .parse(url)
        .hostname
        .split(".")
        .map((_, i, a) => a.slice(i).join("."))
        .slice(0, -1);
    const addValidFromJar = jar =>
        domains
            .map(d => [...jar.iterValidForRequest(d, url)])
            .reduce((a, b) => [...a, ...b])
            .forEach(c => cookies += c.serialize() + "; ");
    if(cookieJars) {
        if(Array.isArray(cookieJars) && cookieJars.every(c => c instanceof CookieJar)) {
            cookieJars.forEach(jar => {
                if(!jar.flags.includes("r"))
                    return;
                addValidFromJar(jar);
            });
        }
        else if(cookieJars instanceof CookieJar && cookieJars.flags.includes("r"))
            addValidFromJar(cookieJars);
        else
            throw new TypeError("First paramter is neither a cookie jar nor an array of cookie jars!");
    }
    if(cookies.length !== 0) {
        if(!options) {
            options = {
                headers: {}
            };
        }
        else if(!options.headers)
            options.headers = {};
        options.headers.cookie = cookies.slice(0, -2);
    }
    const result = await fetch(url, options);
    // i cannot use headers.get() here because it joins the cookies to a string
    cookies = result.headers[Object.getOwnPropertySymbols(result.headers)[0]]["set-cookie"];
    if(cookies && cookieJars) {
        if(Array.isArray(cookieJars)) {
            cookieJars.forEach(jar => {
                if(!jar.flags.includes("w"))
                    return;
                cookies.forEach(c => jar.addCookie(c, url));
            });
        }
        else if(cookieJars.flags.includes("w")) {
            cookies.forEach(c => cookieJars.addCookie(c, url));
        }
    }
    return result;
}

export {cookieFetch as fetch, CookieJar, Cookie};
