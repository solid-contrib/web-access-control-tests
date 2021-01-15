#!/bin/bash
set -e

# either test against a local server or in a container testnet
#export SERVER_ROOT=https://localhost
export SERVER_ROOT=https://alice.localhost:8443 #https://server
export USERNAME_ALICE=alice
export PASSWORD_ALICE=123

export SERVER2_ROOT=https://solidcommunity.net
export USERNAME_BOB=solid-crud-tests-example-1
export BOB_ROOT=https://$USERNAME_BOB.solidcommunity.net
export PASSWORD_BOB=123

export RESULTS_PATH=../NSS-wac-results.json

echo Automated way to get an OIDC issuer cookie for Alice:
export CURL_RESULT_ALICE=`curl -ki $SERVER_ROOT/login/password -d"username=$USERNAME_ALICE&password=$PASSWORD_ALICE" | grep Set-Cookie`
export COOKIE_ALICE=`expr "$CURL_RESULT_ALICE" : '^Set-Cookie:\ \(.*\).'`

echo Other env vars for Alice:
export OIDC_ISSUER_ALICE=$SERVER_ROOT
export WEBID_ALICE=$SERVER_ROOT/profile/card#me
export STORAGE_ROOT_ALICE=$SERVER_ROOT/

echo Automated way to get an OIDC issuer cookie for Bob:
export CURL_RESULT_BOB=`curl -ki $SERVER2_ROOT/login/password -d"username=$USERNAME_BOB&password=$PASSWORD_BOB" | grep Set-Cookie`
export COOKIE_BOB=`expr "$CURL_RESULT_BOB" : '^Set-Cookie:\ \(.*\).'`

echo Other env vars for Bob:
export OIDC_ISSUER_BOB=$SERVER2_ROOT
export WEBID_BOB=$BOB_ROOT/profile/card#me
export STORAGE_ROOT_BOB=$BOB_ROOT/

echo Running with these values for Alice:
echo Cookie: $COOKIE_ALICE
echo OIDC issuer: $OIDC_ISSUER_ALICE
echo WebID: $WEBID_ALICE
echo Storage Root: $STORAGE_ROOT_ALICE

echo Running with these values for Bob:
echo Cookie: $COOKIE_BOB
echo OIDC issuer: $OIDC_ISSUER_BOB
echo WebID: $WEBID_BOB
echo Storage Root: $STORAGE_ROOT_BOB

export NODE_TLS_REJECT_UNAUTHORIZED=0

# npm run jest "$@"
npm run jest -- --json --outputFile="$RESULTS_PATH" "$@"
