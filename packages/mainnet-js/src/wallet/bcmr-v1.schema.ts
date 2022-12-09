/**
 * A mapping of identifiers to URIs associated with an entity. URI identifiers
 * may be widely-standardized or registry-specific. Values must be valid URIs,
 * including a protocol prefix – e.g. `https://` or `ipfs://`., Clients are only
 * required to support `https` and `ipfs` URIs, but any scheme may be specified.
 */
 export type URIs = {
  [identifier: string]: string;
};

/**
 * A mapping of extension identifiers to extension definitions. Extensions may
 * be widely standardized or registry-specific, and extension definitions may
 * be values of any type.
 */
export type Extensions = {
  [identifier: string]: unknown;
};

/**
 * Tags allow registries to classify and group identities by a variety of
 * characteristics. Tags are standardized within a registry and may represent
 * either labels applied by that registry or designations by external
 * authorities (certification, membership, ownership, etc.) that are tracked by
 * that registry.
 *
 * Examples of possible tags include: `individual`, `organization`, `token`,
 * `wallet`, `exchange`, `staking`, `utility-token`, `security-token`,
 * `stablecoin`, `wrapped`, `collectable`, `deflationary`, `governance`,
 * `decentralized-exchange`, `liquidity-provider`, `sidechain`,
 * `sidechain-bridge`, `acme-audited`, `acme-endorsed`, etc.
 *
 * Tags may be used by clients in search, discovery, and filtering of
 * identities, and they can also convey information like accreditation from
 * investor protection organizations, public certifications by security or
 * financial auditors, and other designations that signal integrity and value
 * to users.
 */
export type Tag = {
  /**
   * The name of this tag for use in interfaces. Names longer than `20`
   * characters may be elided in some interfaces.
   *
   * E.g. `Individual`, `Token`, `Audited by ACME, Inc.`, etc.
   */
  name: string;
  /**
   * A string describing this tag for use in user interfaces. Descriptions
   * longer than `160` characters may be elided in some interfaces.
   *
   * E.g. `An identity maintained by a single individual.`; `An identity
   * representing a type of token.`; `An on-chain application that has passed
   * security audits by ACME, Inc.`; etc.
   */
  description?: string;
  /**
   * A mapping of identifiers to URIs associated with this tag. URI identifiers
   * may be widely-standardized or registry-specific. Values must be valid URIs,
   * including a protocol prefix (e.g. `https://` or `ipfs://`). Clients are
   * only required to support `https` and `ipfs` URIs, but any scheme may
   * be specified.
   *
   * The following identifiers are recommended for all tags:
   * - `icon`
   * - `web`
   *
   * The following optional identifiers are standardized:
   * - `blog`
   * - `chat`
   * - `forum`
   * - `icon-intro`
   * - `registry`
   * - `support`
   *
   * For details on these standard identifiers, see:
   * https://github.com/bitjson/chip-bcmr#uri-identifiers
   *
   * Custom URI identifiers allow for sharing social networking profiles, p2p
   * connection information, and other application-specific URIs. Identifiers
   * must be lowercase, alphanumeric strings, with no whitespace or special
   * characters other than dashes (as a regular expression: `/^[-a-z0-9]+$/`).
   *
   * For example, some common identifiers include: `discord`, `docker`,
   * `facebook`, `git`, `github`, `gitter`, `instagram`, `linkedin`, `matrix`,
   * `npm`, `reddit`, `slack`, `substack`, `telegram`, `twitter`, `wechat`,
   * `youtube`.
   */
  uris?: URIs;
  /**
   * A mapping of `Tag` extension identifiers to extension definitions.
   * Extensions may be widely standardized or registry-specific, and extension
   * definitions may be values of any type.
   */
  extensions?: Extensions;
};

/**
 * A Bitcoin Cash Metadata Registry is an authenticated JSON file containing
 * metadata about tokens, identities, contract applications, and other on-chain
 * artifacts. BCMRs conform to the Bitcoin Cash Metadata Registry JSON Schema,
 * and they can be published and maintained by any entity or individual.
 */
export type Registry = {
  /**
   * The schema used by this registry. Many JSON editors can automatically
   * provide inline documentation and autocomplete support using the `$schema`
   * property, so it is recommended that registries include it. E.g.:
   * `https://raw.githubusercontent.com/bitjson/chip-bcmr/master/registry-v1.schema.json`
   */
  $schema?: string;
  /**
   * The version of this registry. Versioning adheres to Semantic Versioning
   * (https://semver.org/).
   */
  version: {
    /**
     * The major version is incremented when an identity is removed.
     */
    major: number;
    /**
     * The minor version is incremented when an identity is added or a new
     * identity snapshot is added.
     */
    minor: number;
    /**
     * The patch version is incremented when an existing identity or identity
     * snapshot is modified (e.g. to correct an error or add a missing piece of
     * information) or when other registry properties (e.g. registry `name`,
     * `description`, `uris`, etc.) are modified.
     *
     * Generally, substantive changes to an existing identity should be made
     * using a new identity snapshot in a minor version upgrade – this allows
     * clients to provide a better user experience by noting the change in
     * relevant user interfaces.
     *
     * For example, patch upgrades might include spelling corrections in an
     * existing snapshot or the addition of an `icon-svg` containing a
     * higher-resolution version of an existing `icon` image. On the other hand,
     * a rebranding in which the icon is substantially changed may warrant a new
     * identity snapshot to be added in a minor version upgrade.
     */
    patch: number;
  };
  /**
   * The timestamp of the latest revision made to this registry version. The
   * timestamp must be provided in simplified extended ISO 8601 format, a
   * 24-character string of format `YYYY-MM-DDTHH:mm:ss.sssZ` where timezone is
   * zero UTC (denoted by `Z`). Note, this is the format returned by ECMAScript
   * `Date.toISOString()`.
   */
  latestRevision: string;
  /**
   * The identity information of this particular registry, provided as either an
   * authbase (recommended) or an `IdentitySnapshot`.
   *
   * An authbase is a 32-byte, hex-encoded transaction hash (A.K.A. TXID) for
   * which the zeroth-descendant transaction chain (ZDTC) authenticates and
   * publishes all registry updates. If an authbase is provided, the registry's
   * identity information can be found in `identities[authbase]`, and clients
   * should immediately attempt to verify the registry's identity on-chain.
   * (See https://github.com/bitjson/chip-bcmr#chain-resolved-registries)
   *
   * If an `IdentitySnapshot` is provided directly, this registry does not
   * support on-chain resolution/authentication, and the contained
   * `IdentitySnapshot` can only be authenticated via DNS/HTTPS.
   */
  registryIdentity: string | IdentitySnapshot;
  /**
   * A mapping of authbases to the `IdentityHistory` for that identity.
   *
   * An authbase is a 32-byte, hex-encoded transaction hash (A.K.A. TXID) for
   * which the zeroth-descendant transaction chain (ZDTC) authenticates and
   * publishes an identity's claimed metadata.
   *
   * Identities may represent metadata registries, specific types of tokens,
   * companies, organizations, individuals, or other on-chain entities.
   */
  identities?: {
    [authbase: string]: IdentityHistory;
  };
  /**
   * A map of registry-specific `Tag`s used by this registry to convey
   * information about identities it tracks.
   *
   * Tags allow registries to group identities into collections of related
   * identities, marking characteristics or those identities. Tags are
   * standardized within a registry and may represent either labels applied by
   * that registry (e.g. `individual`, `organization`, `token`, `wallet`,
   * `exchange`, `staking`, `utility-token`, `security-token`, `stablecoin`,
   * `wrapped`, `collectable`, `deflationary`, `governance`,
   * `decentralized-exchange`, `liquidity-provider`, `sidechain`,
   * `sidechain-bridge`, etc.) or designations by external authorities
   * (certification, membership, ownership, etc.) that are tracked by
   * that registry.
   *
   * Tags may be used by clients in search, discover, and filtering of
   * identities, and they can also convey information like accreditation from
   * investor protection organizations, public certifications by security or
   * financial auditors, and other designations that signal legitimacy and value
   * to users.
   */
  tags?: {
    [identifier: string]: Tag;
  };
  /**
   * A mapping of `Registry` extension identifiers to extension definitions.
   * Extensions may be widely standardized or registry-specific, and extension
   * definitions may be values of any type.
   *
   * Standardized extensions for `Registry`s include the `locale` extension. See
   * https://github.com/bitjson/chip-bcmr#locales-extension for details.
   */
  extensions?: Extensions;
  /**
   * The license under which this registry is published. This may be specified
   * as either a SPDX short identifier (https://spdx.org/licenses/) or by
   * including the full text of the license.
   *
   * Common values include:
   *  - `CC0-1.0`: https://creativecommons.org/publicdomain/zero/1.0/
   *  - `MIT`: https://opensource.org/licenses/MIT
   */
  license?: string;
};

/**
 * A snapshot of the metadata for a particular identity at a specific time.
 *
 */
export type IdentitySnapshot = {
  /**
   * The name of this identity for use in interfaces. Names longer than
   * `20` characters may be elided in some interfaces.
   *
   * E.g. `ACME Class A Shares`, `ACME Registry`, `Satoshi Nakamoto`, etc.
   */
  name: string;
  /**
   * A string describing this identity for use in user interfaces.
   * Descriptions longer than `160` characters may be elided in some interfaces.
   *
   * E.g. `The common stock issued by ACME, Inc.`, `A metadata
   * registry maintained by Company Name, the embedded registry for Wallet
   * Name.`; `Software developer and lead maintainer of Wallet Name.`; etc.
   */
  description?: string;
  /**
   * An array of `Tag` identifiers marking the `Tag`s associated with this
   * identity. All specified tag identifiers must be defined in the registry's
   * `tags` mapping.
   */
  tags?: string[];
  /**
   * The timing information for the introduction of this identity snapshot.
   * Each timestamps may be provided as either an ISO string (simplified
   * extended ISO 8601 format) or as a locktime value: an integer from `0` to
   * `4294967295` (inclusive) where values less than `500000000` are understood
   * to be a block height (the current block number in the chain, beginning from
   * block `0`), and values greater than or equal to `500000000` are understood
   * to be a Median Time Past (BIP113) UNIX timestamp.
   *
   * Generally, timestamps should be provided as an ISO string unless on-chain
   * artifacts require the locktime value (e.g. an on-chain migration that is
   * set to complete at a particular locktime value).
   */
  time: {
    /**
     * The timestamp at which this identity snapshot begins to be active. If
     * `complete` isn't specified, this is a precise time at which this
     * snapshot takes effect and clients should begin using the new information.
     */
    begin: string | number;
    /**
     * The timestamp at which this identity snapshot is fully in effect. This
     * value should only be provided if the snapshot takes effect over a period
     * of time (e.g. an in-circulation token identity is gradually migrating to
     * a new category). In these cases, clients should gradually migrate to
     * using the new information beginning after the `begin` time and completing
     * at the `complete` time.
     */
    complete?: string | number;
  };
  /**
   * If this identity is a type of token, a data structure indicating how tokens
   * should be displayed in user interfaces. Omitted for non-token identities.
   */
  token?: {
    /**
     * The current token category used by this identity. Often, this will be
     * equal to the identities authbase, but some token identities must migrate
     * to new categories for technical reasons.
     */
    category: string;
    /**
     * An abbreviation used to uniquely identity this token category.
     *
     * Symbols must be comprised only of capital letters, numbers, and dashes
     * (`-`). This can be validated with the regular expression:
     * `/^[-A-Z0-9]+$/`.
     */
    symbol: string;
    /**
     * An integer between `0` and `18` (inclusive) indicating the divisibility
     * of the primary unit of this token category.
     *
     * This is the number of digits that can appear after the decimal separator
     * in fungible token amounts. For a token category with a `symbol` of
     * `SYMBOL` and a `decimals` of `2`, a fungible token amount of `12345`
     * should be displayed as `123.45 SYMBOL`.
     *
     * If omitted, defaults to `0`.
     */
    decimals?: number;
    /**
     * Display information for non-fungible tokens (NFTs) of this identity.
     * Omitted for token categories without NFTs.
     */
    nfts?: {
      /**
       * A string describing how this identity uses NFTs (for use in user
       * interfaces). Descriptions longer than `160` characters may be elided in
       * some interfaces.
       *
       * E.g. `ACME DEX NFT order receipts are issued when you place orders on
       * the decentralized exchange. After orders are processed, order receipts
       * can be redeemed for purchased tokens or sales proceeds.`; `ACME Game
       * collectable NFTs unlock unique playable content, user avatars, and item
       * skins in ACME Game Online.`; etc.
       */
      description?: string;
      /**
       * A mapping of field identifier to field definitions for the data fields
       * that can appear in NFT commitments of this category.
       */
      fields: {
        [identifier: string]: {
          /**
           * The name of this field for use in interfaces. Names longer than
           * `20` characters may be elided in some interfaces.
           *
           * E.g. `BCH Pledged`, `Tokens Sold`, `Seat Number`,
           * `IPFS Content Identifier`, `HTTPS URL` etc.
           */
          name?: string;
          /**
           * A string describing how this identity uses NFTs (for use in user
           * interfaces). Descriptions longer than `160` characters may be
           * elided in some interfaces.
           *
           * E.g. `The BCH value pledged at the time this receipt was issued.`;
           * `The number of tokens sold in this order.`; `The seat number
           * associated with this ticket.`; `The IPFS`
           * collectable NFTs unlock unique playable content, user avatars, and item
           * skins in ACME Game Online.`; etc.
           */
          description?: string;
          /**
           * The expected encoding of this field when read from the parsing
           * altstack (see `token.nft.parse`). All encoding definitions must
           * have a `type`, and some encoding definitions allow for additional
           * hinting about display strategies in clients.
           *
           * Encoding types may be set to `binary`, `boolean`, `hex`, `number`,
           * or `utf8`:
           *
           * - `binary` types should be displayed as binary literals (e.g.
           * `0b0101`)
           * - `boolean` types should be displayed as `true` if exactly `0x01`
           * or `false` if exactly `0x00`. If a boolean value does not match one
           * of these values, clients should represent the NFT as unable to be
           * parsed (e.g. simply display the full `commitment`).
           * - `hex` types should be displayed as hex literals (e.g.`0xabcd`).
           * - `https-url` types are percent encoded with the `https://` prefix
           * omitted; they may be displayed as URIs or as activatable links.
           * - `ipfs-cid` types are binary-encoded IPFS Content Identifiers;
           * they may be displayed as URIs or as activatable links.
           * - `locktime` types are `OP_TXLOCKTIME` results: integers from `0`
           * to `4294967295` (inclusive) where values less than `500000000` are
           * understood to be a block height (the current block number in the
           * chain, beginning from block `0`), and values greater than or equal
           * to `500000000` are understood to be a Median Time Past (BIP113)
           * UNIX timestamp. (Note, sequence age is not currently supported.)
           * - `number` types should be displayed according the their configured
           * `decimals` and `unit` values.
           * - `utf8` types should be displayed as utf8 strings.
           */
          encoding:
            | {
                type:
                  | 'binary'
                  | 'boolean'
                  | 'hex'
                  | 'https-url'
                  | 'ipfs-cid'
                  | `locktime`
                  | 'utf8';
              }
            | {
                type: 'number';
                /**
                 * The `aggregate` property indicates that aggregating this
                 * field from multiple NFTs is desirable in user interfaces. For
                 * example, for a field named `BCH Pledged` where `aggregate` is
                 * `add`, the client can display a `Total BCH Pledged` in any
                 * user interface listing more than one NFT.
                 *
                 * If specified, clients should aggregate the field from all
                 * NFTs within a view (e.g. NFTs held by a single wallet, NFTs
                 * existing in a single transaction's outputs, etc.) using the
                 * specified operation. Note, while aggregation could be
                 * performed using any commutative operation – multiplication,
                 * bitwise AND, bitwise OR, and bitwise XOR, etc. – only `add`
                 * is currently supported.
                 */
                aggregate?: 'add';
                /**
                 * An integer between `0` and `18` (inclusive) indicating the
                 * divisibility of the primary unit of this token field.
                 *
                 * This is the number of digits that can appear after the
                 * decimal separator in amounts. For a field with a `decimals`
                 * of `2`, a value of `123456` should be displayed as `1234.56`.
                 *
                 * If omitted, defaults to `0`.
                 */
                decimals?: number;
                /**
                 * The unit in which this field is denominated, taking the
                 * `decimals` value into account. If representing fungible token
                 * amount, this will often be the symbol of the represented
                 * token category.
                 *
                 * E.g. `BCH`, `sats`, `AcmeUSD`, etc.
                 *
                 * If not provided, clients should not represent this field as
                 * having a unit beyond the field's `name`.
                 */
                unit?: string;
              };
          /**
           * A mapping of identifiers to URIs associated with this NFT field.
           * URI identifiers may be widely-standardized or registry-specific.
           * Values must be valid URIs, including a protocol prefix (e.g.
           * `https://` or `ipfs://`). Clients are only required to support
           * `https` and `ipfs` URIs, but any scheme may be specified.
           */
          uris?: URIs;
          /**
           * A mapping of NFT field extension identifiers to extension
           * definitions. Extensions may be widely standardized or
           * registry-specific, and extension definitions may be values of
           * any type.
           */
          extensions?: Extensions;
        };
      };
      /**
       * Parsing and interpretation information for all NFTs of this category.
       *
       * Parsing instructions are provided in the `bytecode` property, and the
       * results are interpreted using the `types` property.
       */
      parse: {
        /**
         * A segment of hex-encoded Bitcoin Cash VM bytecode that parses NFT
         * commitments of this category and returns a list of NFT field values
         * via the altstack. The `bytecode` is taken as locking bytecode
         * evaluated after pushing the full NFT commitment to the stack (as if
         * pushed in a single-operation unlocking bytecode).
         *
         * If the resulting stack is not valid (a single "truthy" element
         * remaining on the stack) – or if the altstack is empty – parsing has
         * failed and clients should represent the NFT as unable to be parsed
         * (e.g. simply display the full `commitment`).
         *
         * On successful parsing evaluations, the bottom item on the altstack
         * indicates the type of the NFT according to the matching definition in
         * `types`. If no match is found, clients should represent the NFT as
         * unable to be parsed.
         */
        bytecode: string;
        /**
         * A mapping of hex-encoded values to definitions of possible NFT types
         * in this category.
         */
        types: {
          /**
           * A definition for one type of NFT within a token category. NFT types
           * are indexed by the expected hex-encoded value of the bottom
           * altstack item following evaluation of `token.nft.parse.bytecode`.
           * The remaining altstack items are mapped to NFT fields according to
           * the `fields` property of the matching NFT type.
           */
          [bottomAltStackItemHex: string]: {
            /**
             * The name of this NFT type for use in interfaces. Names longer than
             * `20` characters may be elided in some interfaces.
             *
             * E.g. `Market Order Buys`, `Limit Order Sales`, `Pledge Receipts`,
             * `ACME Stadium Tickets`, `Sealed Votes`, etc.
             */
            name: string;
            /**
             * A string describing this NFT type for use in user interfaces.
             * Descriptions longer than `160` characters may be elided in
             * some interfaces.
             *
             * E.g. `Receipts issued by the exchange to record details about
             * purchases. After settlement, these receipts are redeemed for the
             * purchased tokens.`; `Receipts issued by the crowdfunding campaign
             * to document the value of funds pledged. If the user decides to
             * cancel their pledge before the campaign completes, these receipts
             * can be redeemed for a full refund.`; `Tickets issued for events
             * at ACME Stadium.`; `Sealed ballots certified by ACME
             * decentralized organization during the voting period. After the
             * voting period ends, these ballots must be revealed to reclaim the
             * tokens used for voting.`; etc.
             */
            description?: string;
            /**
             * A list of identifiers for fields contained in NFTs of this type.
             * On successful parsing evaluations, the bottom item on the
             * altstack indicates the matched NFT type, and the remaining
             * altstack items represent NFT field contents in the order listed
             * (where `fields[0]` is the second-to-bottom item, and the final
             * item in `fields` is the top of the altstack).
             *
             * Fields should be ordered by recommended importance from most
             * important to least important; in user interfaces, clients should
             * display fields at lower indexes more prominently than those at
             * higher indexes, e.g. if some fields cannot be displayed in
             * minimized interfaces, higher-importance fields can still be
             * represented. (Note, this ordering is controlled by the bytecode
             * specified in `token.nft.parse.bytecode`.)
             */
            fields: string[];
            /**
             * A mapping of identifiers to URIs associated with this NFT type.
             * URI identifiers may be widely-standardized or registry-specific.
             * Values must be valid URIs, including a protocol prefix (e.g.
             * `https://` or `ipfs://`). Clients are only required to support
             * `https` and `ipfs` URIs, but any scheme may be specified.
             */
            uris?: URIs;
            /**
             * A mapping of NFT type extension identifiers to extension
             * definitions. Extensions may be widely standardized or
             * registry-specific, and extension definitions may be values of
             * any type.
             */
            extensions?: Extensions;
          };
        };
      };
    };
  };

  /**
   * The status of this identity, must be `active`, `inactive`, or `burned`. If
   * omitted, defaults to `active`.
   * - Identities with an `active` status should be actively tracked by clients.
   * - Identities with an `inactive` status may be considered for archival by
   * clients and may be removed in future registry versions.
   * - Identities with a `burned` status have been destroyed by setting the
   * latest identity output to a data-carrier output (`OP_RETURN`), permanently
   * terminating the authchain. Clients should archive burned identities and –
   * if the burned identity represented a token type – consider burning any
   * remaining tokens of that category to reclaim funds from those outputs.
   */
  status?: 'active' | 'inactive' | 'burned';

  /**
   * A mapping of identifiers to URIs associated with this identity. URI
   * identifiers may be widely-standardized or registry-specific. Values must be
   * valid URIs, including a protocol prefix (e.g. `https://` or `ipfs://`).
   * Clients are only required to support `https` and `ipfs` URIs, but any
   * scheme may be specified.
   *
   * The following identifiers are recommended for all identities:
   * - `icon`
   * - `web`
   *
   * The following optional identifiers are standardized:
   * - `blog`
   * - `chat`
   * - `forum`
   * - `icon-intro`
   * - `registry`
   * - `support`
   *
   * For details on these standard identifiers, see:
   * https://github.com/bitjson/chip-bcmr#uri-identifiers
   *
   * Custom URI identifiers allow for sharing social networking profiles, p2p
   * connection information, and other application-specific URIs. Identifiers
   * must be lowercase, alphanumeric strings, with no whitespace or special
   * characters other than dashes (as a regular expression: `/^[-a-z0-9]+$/`).
   *
   * For example, some common identifiers include: `discord`, `docker`,
   * `facebook`, `git`, `github`, `gitter`, `instagram`, `linkedin`, `matrix`,
   * `npm`, `reddit`, `slack`, `substack`, `telegram`, `twitter`, `wechat`,
   * `youtube`.
   */
  uris?: URIs;

  /**
   * A mapping of `IdentitySnapshot` extension identifiers to extension
   * definitions. Extensions may be widely standardized or registry-specific,
   * and extension definitions may be values of any type.
   *
   * Standardized extensions for `IdentitySnapshot`s include the `authchain`
   * extension. See
   * https://github.com/bitjson/chip-bcmr#authchain-extension for details.
   */
  extensions?: Extensions;
};

/**
 * An array of `IdentitySnapshot`s, ordered from newest to oldest documenting
 * the evolution of a particular identity. Typically, the current identity
 * information is the record at index `0`, but in cases where a planned
 * migration has not yet begun (the snapshot's `time.begin` has not been
 * reached), the record at index `1` is considered the current identity.
 *
 * This strategy allows wallets and other user interfaces to offer better
 * experiences when an identity is rebranded, a token redenominated, or other
 * important metadata is modified in a coordinated update. For example, a wallet
 * may warn token holders of a forthcoming rebranding of fungible tokens they
 * hold; after the change, the wallet may continue to offer prominent interface
 * hints that the rebranded tokens was recently updated.
 *
 * Note, only the `IdentitySnapshot`s at index `0` and `1` can be considered
 * part of an identities "current" information (based on their `time` settings
 * in relation to current time). E.g. even if two snapshots have active,
 * overlapping migration periods (i.e. the snapshot at `2` is still relevant for
 * the snapshot at `1`), clients should only attempt to display the migration
 * from the snapshot at index `1` to that at index `0`.
 */
export type IdentityHistory = IdentitySnapshot[];