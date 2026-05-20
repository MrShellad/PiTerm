use async_trait::async_trait;
use russh::client;
use russh_keys::key::PublicKey;

#[derive(Clone, Copy)]
pub struct PiTermClientHandler;

#[async_trait]
impl client::Handler for PiTermClientHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        _server_public_key: &PublicKey,
    ) -> Result<bool, Self::Error> {
        // Trust all keys at transport layer. Host verification is handled manually
        // at the Tauri layer via database known_hosts lookup.
        Ok(true)
    }
}
