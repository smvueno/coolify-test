import type { Schema, Struct } from '@strapi/strapi';

export interface BlocksCta extends Struct.ComponentSchema {
  collectionName: 'components_blocks_ctas';
  info: {
    description: 'Call to action section';
    displayName: 'CTA';
  };
  attributes: {
    backgroundImage: Schema.Attribute.Media<'images'>;
    body: Schema.Attribute.Text;
    cta: Schema.Attribute.Component<'shared.link', false> &
      Schema.Attribute.Required;
    heading: Schema.Attribute.String & Schema.Attribute.Required;
    variant: Schema.Attribute.Enumeration<['default', 'bordered', 'minimal']> &
      Schema.Attribute.DefaultTo<'default'>;
  };
}

export interface BlocksFeatures extends Struct.ComponentSchema {
  collectionName: 'components_blocks_features';
  info: {
    description: 'Features grid section with icon cards';
    displayName: 'Features';
  };
  attributes: {
    features: Schema.Attribute.Component<'shared.feature-item', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 12;
          min: 1;
        },
        number
      >;
    heading: Schema.Attribute.String;
    layout: Schema.Attribute.Enumeration<['grid-2', 'grid-3', 'grid-4']> &
      Schema.Attribute.DefaultTo<'grid-3'>;
    subheading: Schema.Attribute.Text;
  };
}

export interface BlocksHero extends Struct.ComponentSchema {
  collectionName: 'components_blocks_heroes';
  info: {
    description: 'Hero section with headline, subtext, CTA buttons, and background image';
    displayName: 'Hero';
  };
  attributes: {
    alignment: Schema.Attribute.Enumeration<['left', 'center', 'right']> &
      Schema.Attribute.DefaultTo<'center'>;
    backgroundImage: Schema.Attribute.Media<'images'>;
    headline: Schema.Attribute.String & Schema.Attribute.Required;
    primaryCta: Schema.Attribute.Component<'shared.link', false>;
    secondaryCta: Schema.Attribute.Component<'shared.link', false>;
    size: Schema.Attribute.Enumeration<['small', 'medium', 'large']> &
      Schema.Attribute.DefaultTo<'large'>;
    subtext: Schema.Attribute.Text;
  };
}

export interface BlocksRichText extends Struct.ComponentSchema {
  collectionName: 'components_blocks_rich_texts';
  info: {
    description: 'Rich text content block';
    displayName: 'Rich Text';
  };
  attributes: {
    content: Schema.Attribute.RichText & Schema.Attribute.Required;
    maxWidth: Schema.Attribute.Enumeration<
      ['narrow', 'default', 'wide', 'full']
    > &
      Schema.Attribute.DefaultTo<'default'>;
  };
}

export interface SharedFeatureItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_feature_items';
  info: {
    description: 'Single feature card with icon, title, and description';
    displayName: 'Feature Item';
  };
  attributes: {
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    icon: Schema.Attribute.String;
    iconImage: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_links';
  info: {
    description: 'A link or button with label and URL';
    displayName: 'Link';
  };
  attributes: {
    isExternal: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
    variant: Schema.Attribute.Enumeration<
      ['primary', 'secondary', 'outline', 'ghost']
    > &
      Schema.Attribute.DefaultTo<'primary'>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'blocks.cta': BlocksCta;
      'blocks.features': BlocksFeatures;
      'blocks.hero': BlocksHero;
      'blocks.rich-text': BlocksRichText;
      'shared.feature-item': SharedFeatureItem;
      'shared.link': SharedLink;
    }
  }
}
